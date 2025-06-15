const express = require('express');
const multer = require('multer');
const path = require('path');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const PO = require('../models/PO');
const Counter = require('../models/Counter');
const auth = require('../middleware/auth');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Helper function to get next PO number
const getNextPONumber = async () => {
  try {
    const counter = await Counter.findByIdAndUpdate(
      'po_sequence',
      { $inc: { sequence_value: 1 } },
      { new: true, upsert: true }
    );
    return `PO-${counter.sequence_value}`;
  } catch (error) {
    throw new Error('Failed to generate PO number');
  }
};

// Create new PO
router.post('/create', auth, async (req, res) => {
  try {
    const poNumber = await getNextPONumber();
    
    const newPO = new PO({
      poNumber,
      createdBy: req.user._id,
      machines: [],
      status: 'draft'
    });

    await newPO.save();

    res.status(201).json({
      message: 'PO created successfully',
      po: newPO
    });
  } catch (error) {
    console.error('Create PO error:', error);
    res.status(500).json({ message: 'Failed to create PO' });
  }
});

// Get all POs for the authenticated user
router.get('/', auth, async (req, res) => {
  try {
    const { search, status } = req.query;
    let query = { createdBy: req.user._id };

    if (search) {
      query.poNumber = { $regex: search, $options: 'i' };
    }

    if (status && status !== 'all') {
      query.currentStage = status;
    }

    const pos = await PO.find(query)
      .sort({ createdAt: -1 })
      .select('poNumber createdAt status currentStage machines isFinalized stageCompletedAt');

    // Add display names for stages
    const posWithDisplayNames = pos.map(po => ({
      ...po.toObject(),
      currentStageDisplay: po.getStageDisplayName(po.currentStage)
    }));

    res.json(posWithDisplayNames);
  } catch (error) {
    console.error('Get POs error:', error);
    res.status(500).json({ message: 'Failed to fetch POs' });
  }
});

// Get specific PO by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const po = await PO.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!po) {
      return res.status(404).json({ message: 'PO not found' });
    }

    res.json(po);
  } catch (error) {
    console.error('Get PO error:', error);
    res.status(500).json({ message: 'Failed to fetch PO' });
  }
});

// Get available machine numbers for a PO
router.get('/:id/available-machines', auth, async (req, res) => {
  try {
    const po = await PO.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!po) {
      return res.status(404).json({ message: 'PO not found' });
    }

    const availableMachines = po.getAvailableMachineNumbers();
    const canAddMore = po.canAddMoreMachines();

    res.json({
      availableMachines,
      canAddMore,
      currentMachineCount: po.machines.length
    });
  } catch (error) {
    console.error('Get available machines error:', error);
    res.status(500).json({ message: 'Failed to fetch available machines' });
  }
});

// Add machine to current stage
router.post('/:id/machines/:stage', auth, upload.single('image'), async (req, res) => {
  try {
    console.log('Adding machine to PO:', req.params.id, 'Stage:', req.params.stage);
    console.log('Request body:', req.body);
    console.log('Uploaded file:', req.file);

    const { stage } = req.params;
    const po = await PO.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!po) {
      console.log('PO not found');
      return res.status(404).json({ message: 'PO not found' });
    }

    // Allow any stage for individual machine progression
    // Removed restriction to only current PO stage

    if (!po.canAddMoreMachines()) {
      console.log('Maximum machines reached');
      return res.status(400).json({ message: 'Maximum 6 machines allowed per PO' });
    }

    const { machineNo } = req.body;

    // Check if machine number is already used in this PO
    const existingMachine = po.machines.find(m => m.machineNo === parseInt(machineNo));
    if (existingMachine) {
      console.log('Machine number already used:', machineNo);
      return res.status(400).json({ message: 'Machine number already used in this PO' });
    }

    // Create machine entry based on stage
    let machineEntry = {
      machineNo: parseInt(machineNo),
      completedStages: []
    };

    // Add stage-specific data
    if (stage === 'requirement') {
      const { size, micron, bagType, quantity, print, color, packagingType, material } = req.body;
      machineEntry.requirement = {
        machineNo: parseInt(machineNo),
        size,
        micron,
        bagType,
        quantity: parseInt(quantity),
        print,
        color,
        packagingType,
        material,
        image: req.file ? req.file.filename : null
      };
      machineEntry.completedStages.push('requirement');
    }

    console.log('Creating machine entry:', machineEntry);

    po.machines.push(machineEntry);
    if (po.status === 'draft') {
      po.status = 'in-progress';
    }
    await po.save();

    // Get the newly added machine with its MongoDB _id
    const savedMachine = po.machines[po.machines.length - 1];
    console.log('Machine saved successfully:', savedMachine);

    res.status(201).json({
      message: 'Machine added successfully',
      machine: savedMachine,
      po: {
        currentStage: po.currentStage,
        currentStageDisplay: po.getStageDisplayName(po.currentStage)
      }
    });
  } catch (error) {
    console.error('Add machine error:', error);
    res.status(500).json({ message: 'Failed to add machine', error: error.message });
  }
});

// Update machine stage
router.put('/:poId/machines/:machineId/stages/:stage', auth, async (req, res) => {
  try {
    const { poId, machineId, stage } = req.params;
    const stageData = req.body;

    console.log('Updating machine stage:', { poId, machineId, stage });
    console.log('Stage data:', stageData);

    // Map URL stage names to database stage names
    const stageMapping = {
      'requirement': 'requirement',
      'extrusion': 'extrusionProduction',
      'printing': 'printing',
      'cutting': 'cuttingSealing',
      'punch': 'punch',
      'packaging': 'packagingDispatch'
    };

    // Use the mapped stage name for database operations
    const dbStageName = stageMapping[stage] || stage;
    console.log('Stage mapping:', { urlStage: stage, dbStage: dbStageName });

    const po = await PO.findOne({
      _id: poId,
      createdBy: req.user._id
    });

    if (!po) {
      console.log('PO not found for update');
      return res.status(404).json({ message: 'PO not found' });
    }

    // Allow any stage for individual machine progression
    // Removed restriction to only current PO stage

    const machine = po.machines.id(machineId);
    if (!machine) {
      console.log('Machine not found:', machineId);
      console.log('Available machines:', po.machines.map(m => ({ id: m._id, machineNo: m.machineNo })));
      return res.status(404).json({ message: 'Machine not found' });
    }

    console.log('Found machine:', machine.machineNo);
    console.log('Current completedStages before update:', machine.completedStages);
    console.log('Updating stage:', dbStageName);
    console.log('Stage data:', stageData);

    // Update the specific stage using the database stage name
    machine[dbStageName] = stageData;

    // Add stage to completed stages if not already present (using database stage name)
    if (!machine.completedStages.includes(dbStageName)) {
      machine.completedStages.push(dbStageName);
      console.log('Added stage to completedStages:', dbStageName);
    } else {
      console.log('Stage already in completedStages:', dbStageName);
    }

    console.log('Updated completedStages:', machine.completedStages);

    // Check if all machines for current stage are completed
    const allMachinesCompleted = po.machines.every(m => m.completedStages.includes(dbStageName));

    await po.save();

    console.log('Machine stage updated successfully');
    console.log('Final machine completedStages:', machine.completedStages);

    res.json({
      message: 'Stage updated successfully',
      machine,
      allMachinesCompleted,
      po: {
        currentStage: po.currentStage,
        currentStageDisplay: po.getStageDisplayName(po.currentStage)
      }
    });
  } catch (error) {
    console.error('Update stage error:', error);
    res.status(500).json({ message: 'Failed to update stage', error: error.message });
  }
});

// Complete individual machine stage
router.put('/:poId/machines/:machineId/complete-stage/:stage', auth, async (req, res) => {
  try {
    const { poId, machineId, stage } = req.params;

    console.log('Completing machine stage:', { poId, machineId, stage });

    const po = await PO.findOne({
      _id: poId,
      createdBy: req.user._id
    });

    if (!po) {
      console.log('PO not found for stage completion');
      return res.status(404).json({ message: 'PO not found' });
    }

    // Allow any stage for individual machine progression
    // Removed restriction to only current PO stage

    const machine = po.machines.id(machineId);
    if (!machine) {
      console.log('Machine not found:', machineId);
      return res.status(404).json({ message: 'Machine not found' });
    }

    console.log('Found machine:', machine.machineNo);

    // Add stage to completed stages if not already present
    if (!machine.completedStages.includes(stage)) {
      machine.completedStages.push(stage);
    }

    await po.save();

    console.log('Machine stage completed successfully');

    res.json({
      message: 'Machine stage completed successfully',
      machine,
      po: {
        currentStage: po.currentStage,
        currentStageDisplay: po.getStageDisplayName(po.currentStage)
      }
    });
  } catch (error) {
    console.error('Complete machine stage error:', error);
    res.status(500).json({ message: 'Failed to complete machine stage', error: error.message });
  }
});

// Complete current stage and advance to next
router.put('/:id/complete-stage', auth, async (req, res) => {
  try {
    const po = await PO.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!po) {
      return res.status(404).json({ message: 'PO not found' });
    }

    if (po.currentStage === 'completed') {
      return res.status(400).json({ message: 'PO is already completed' });
    }

    // Advance to next stage
    po.advanceToNextStage();
    await po.save();

    res.json({
      message: 'Stage completed successfully',
      po: {
        currentStage: po.currentStage,
        currentStageDisplay: po.getStageDisplayName(po.currentStage),
        status: po.status,
        isFinalized: po.isFinalized
      }
    });
  } catch (error) {
    console.error('Complete stage error:', error);
    res.status(500).json({ message: 'Failed to complete stage', error: error.message });
  }
});

// Finalize PO
router.put('/:id/finalize', auth, async (req, res) => {
  try {
    const po = await PO.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!po) {
      return res.status(404).json({ message: 'PO not found' });
    }

    po.isFinalized = true;
    po.status = 'completed';
    await po.save();

    res.json({
      message: 'PO finalized successfully',
      po
    });
  } catch (error) {
    console.error('Finalize PO error:', error);
    res.status(500).json({ message: 'Failed to finalize PO' });
  }
});

// Generate PDF for PO
router.get('/:id/pdf', auth, async (req, res) => {
  try {
    const po = await PO.findOne({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!po) {
      return res.status(404).json({ message: 'PO not found' });
    }

    // Create PDF document with landscape orientation for better table layout
    const doc = new PDFDocument({
      margin: 30,
      layout: 'landscape',
      size: 'A4'
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${po.poNumber}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add title
    doc.fontSize(16).text(`Purchase Order: ${po.poNumber}`, { align: 'center' });
    doc.fontSize(10).text(`Date: ${po.createdAt.toDateString()}`, { align: 'center' });
    doc.fontSize(10).text(`Status: ${po.status} | Current Stage: ${po.getStageDisplayName(po.currentStage)}`, { align: 'center' });
    doc.fontSize(10).text(`Machines: ${po.machines.length}/6`, { align: 'center' });
    doc.moveDown(1);

    // Define table structure
    const pageWidth = doc.page.width - 60; // Account for margins
    const colWidths = {
      stage: 120,
      subfield: 100,
      machine: (pageWidth - 220) / 6 // Remaining width divided by 6 machines
    };

    const startX = 30;
    let currentY = doc.y;

    // Helper function to draw table borders
    const drawTableBorder = (x, y, width, height) => {
      doc.rect(x, y, width, height).stroke();
    };

    // Helper function to add text in cell
    const addCellText = (text, x, y, width, height, options = {}) => {
      const fontSize = options.fontSize || 8;
      const align = options.align || 'left';

      doc.fontSize(fontSize);

      // Calculate text position
      const textY = y + (height - fontSize) / 2;

      if (align === 'center') {
        doc.text(text, x, textY, { width: width, align: 'center' });
      } else {
        doc.text(text, x + 2, textY, { width: width - 4, align: align });
      }
    };

    // Draw table headers
    const headerHeight = 20;

    // Stage header
    drawTableBorder(startX, currentY, colWidths.stage, headerHeight);
    addCellText('Workflow Stage', startX, currentY, colWidths.stage, headerHeight, { fontSize: 9, align: 'center' });

    // Subfield header
    drawTableBorder(startX + colWidths.stage, currentY, colWidths.subfield, headerHeight);
    addCellText('Subfield', startX + colWidths.stage, currentY, colWidths.subfield, headerHeight, { fontSize: 9, align: 'center' });

    // Machine headers
    for (let i = 1; i <= 6; i++) {
      const machineX = startX + colWidths.stage + colWidths.subfield + (i - 1) * colWidths.machine;
      drawTableBorder(machineX, currentY, colWidths.machine, headerHeight);
      addCellText(`Machine ${i}`, machineX, currentY, colWidths.machine, headerHeight, { fontSize: 9, align: 'center' });
    }

    currentY += headerHeight;

    // Define all stages and their subfields
    const stageDefinitions = [
      {
        name: 'Requirement',
        subfields: ['Size', 'Micron', 'Bag Type', 'Quantity', 'Print', 'Color', 'Packaging Type', 'Material'],
        dataKey: 'requirement'
      },
      {
        name: 'Extrusion Production',
        subfields: ['Extrusion No.', 'Size', 'Operator Name', 'Ampere', 'Frequency', 'Kgs', 'No. of Rolls', 'Waste', 'QC Approved By', 'Remark'],
        dataKey: 'extrusionProduction'
      },
      {
        name: 'Printing',
        subfields: ['Machine No.', 'Size', 'Operator Name', 'No. of Rolls', 'Waste', 'Kgs'],
        dataKey: 'printing'
      },
      {
        name: 'Cutting & Sealing',
        subfields: ['Machine No.', 'Size', 'Operator Name', 'Heating 1', 'Heating 2', 'No. of Rolls', 'Cutting Waste', 'Print Waste', 'Kgs'],
        dataKey: 'cuttingSealing'
      },
      {
        name: 'Punch',
        subfields: ['Machine No.', 'Bag Size', 'Operator Name', 'Punch Name', 'Kgs', 'Waste'],
        dataKey: 'punch'
      },
      {
        name: 'Packaging & Dispatch',
        subfields: ['Size', 'Total Weight', 'No. of Rolls', 'No. of Bags', 'Challan No.'],
        dataKey: 'packagingDispatch'
      }
    ];

    const rowHeight = 15;

    // Draw table rows
    stageDefinitions.forEach((stage) => {
      stage.subfields.forEach((subfield, subfieldIndex) => {
        // Check if we need a new page
        if (currentY + rowHeight > doc.page.height - 30) {
          doc.addPage();
          currentY = 30;
        }

        // Stage name (only for first subfield of each stage)
        if (subfieldIndex === 0) {
          drawTableBorder(startX, currentY, colWidths.stage, rowHeight * stage.subfields.length);
          addCellText(stage.name, startX, currentY, colWidths.stage, rowHeight * stage.subfields.length, { fontSize: 8, align: 'center' });
        }

        // Subfield name
        drawTableBorder(startX + colWidths.stage, currentY, colWidths.subfield, rowHeight);
        addCellText(subfield, startX + colWidths.stage, currentY, colWidths.subfield, rowHeight, { fontSize: 8 });

        // Machine data
        for (let machineNo = 1; machineNo <= 6; machineNo++) {
          const machineX = startX + colWidths.stage + colWidths.subfield + (machineNo - 1) * colWidths.machine;
          drawTableBorder(machineX, currentY, colWidths.machine, rowHeight);

          // Find machine data
          const machine = po.machines.find(m => m.machineNo === machineNo);
          let cellValue = 'N/A';

          if (machine && machine[stage.dataKey]) {
            const stageData = machine[stage.dataKey];
            const fieldKey = subfield.toLowerCase()
              .replace(/\s+/g, '')
              .replace(/\./g, '')
              .replace('no', 'No')
              .replace('qcapprovedby', 'qcApprovedBy')
              .replace('operatorname', 'operatorName')
              .replace('noofrolls', 'noOfRolls')
              .replace('bagtype', 'bagType')
              .replace('packagingtype', 'packagingType')
              .replace('extrusionno', 'extrusionNo')
              .replace('cuttingwaste', 'cuttingWaste')
              .replace('printwaste', 'printWaste')
              .replace('bagsize', 'bagSize')
              .replace('punchname', 'punchName')
              .replace('totalweight', 'totalWeight')
              .replace('noofbags', 'noOfBags')
              .replace('challanno', 'challanNo')
              .replace('heating1', 'heating1')
              .replace('heating2', 'heating2');

            if (stageData[fieldKey] !== undefined && stageData[fieldKey] !== null && stageData[fieldKey] !== '') {
              cellValue = String(stageData[fieldKey]);
            }
          }

          addCellText(cellValue, machineX, currentY, colWidths.machine, rowHeight, { fontSize: 7 });
        }

        currentY += rowHeight;
      });
    });

    // Finalize PDF
    doc.end();
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ message: 'Failed to generate PDF' });
  }
});

module.exports = router;
