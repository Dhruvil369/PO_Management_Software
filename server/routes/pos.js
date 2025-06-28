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
const getNextPONumber = async() => {
    try {
        const counter = await Counter.findByIdAndUpdate(
            'po_sequence', { $inc: { sequence_value: 1 } }, { new: true, upsert: true }
        );
        return `PO-${counter.sequence_value}`;
    } catch (error) {
        throw new Error('Failed to generate PO number');
    }
};

// Create new PO
router.post('/create', auth, async(req, res) => {
    try {
        const poNumber = await getNextPONumber();
        const { jobTitle } = req.body;
        if (!jobTitle || !jobTitle.trim()) {
            return res.status(400).json({ message: 'Job title is required' });
        }
        const newPO = new PO({
            poNumber,
            createdBy: req.user._id,
            jobTitle,
            machines: [],
            status: 'draft'
        });
        await newPO.save();

        // Emit event to all employees
        const io = req.app.get('io');
        io.emit('po_created', { po: newPO });
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
router.get('/', auth, async(req, res) => {
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
            .select('poNumber jobTitle createdAt status currentStage machines isFinalized stageCompletedAt');

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

// Get all POs (Admin and Employee)
router.get('/all', auth, async(req, res) => {
    try {
        // Admin: get all POs, Employee: get all POs (customize as needed)
        const pos = await PO.find().sort({ createdAt: -1 });
        res.json(pos);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch all POs' });
    }
});

// Get specific PO by ID (Admin or Employee can view any PO)
router.get('/:id', auth, async(req, res) => {
    try {
        // Remove createdBy filter so any authenticated user can view any PO
        const po = await PO.findOne({ _id: req.params.id });
        if (!po) {
            return res.status(404).json({ message: 'PO not found' });
        }
        res.json(po);
    } catch (error) {
        console.error('Get PO error:', error);
        res.status(500).json({ message: 'Failed to fetch PO' });
    }
});

// Get available machine numbers for a PO (Admin or Employee can view any PO)
router.get('/:id/available-machines', auth, async(req, res) => {
    try {
        // Remove createdBy filter so any authenticated user can view available machines
        const po = await PO.findOne({ _id: req.params.id });
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
router.post('/:id/machines/:stage', auth, upload.single('image'), async(req, res) => {
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
            // DEBUG: log all fields received
            console.log('Requirement stage req.body:', req.body);
            const { size, micron, bagType, quantity, print, color, bagFilmColor, packagingType, material, date } = req.body;
            machineEntry.requirement = {
                machineNo: parseInt(machineNo),
                size,
                micron,
                bagType,
                quantity: parseInt(quantity),
                print,
                color,
                bagFilmColor,
                packagingType,
                material,
                image: req.file ? req.file.filename : null,
                date: date ? new Date(date) : null // <-- ensure date is saved as Date
            };
            machineEntry.completedStages.push('requirement');
        } else if (stage === 'packaging') {
            const { size, totalWeight, noOfRolls, noOfBags, date } = req.body;
            // Generate challanNo if not present
            let challanNo = null;
            const Counter = require('../models/Counter');
            const counter = await Counter.findByIdAndUpdate(
                'challan_sequence', { $inc: { sequence_value: 1 } }, { new: true, upsert: true }
            );
            challanNo = counter.sequence_value;
            machineEntry.packagingDispatch = {
                size,
                totalWeight: totalWeight ? parseFloat(totalWeight) : null,
                noOfRolls: noOfRolls ? parseInt(noOfRolls) : null,
                noOfBags: noOfBags ? parseInt(noOfBags) : null,
                challanNo,
                image: req.file ? req.file.filename : null,
                date: date ? new Date(date) : null
            };
            machineEntry.completedStages.push('packagingDispatch');
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

        // After updating PO, emit event to all admins
        const io = req.app.get('io');
        io.emit('po_updated', { poId: req.params.id });

        res.status(201).json({
            message: 'Machine added successfully',
            machine: savedMachine,
            challanNo: savedMachine.packagingDispatch ? savedMachine.packagingDispatch.challanNo : undefined,
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
router.put('/:poId/machines/:machineId/stages/:stage', auth, upload.single('image'), async(req, res) => {
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

        // Remove createdBy filter so any authenticated user can update any PO's machine stage
        const po = await PO.findOne({ _id: poId });

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
        if (dbStageName === 'requirement' && stageData.date) {
            machine[dbStageName] = {
                ...stageData,
                date: new Date(stageData.date)
            };
        } else if (
            (dbStageName === 'extrusionProduction' ||
                dbStageName === 'printing' ||
                dbStageName === 'cuttingSealing' ||
                dbStageName === 'punch' ||
                dbStageName === 'packagingDispatch') &&
            stageData.data
        ) {
            // Map 'data' from frontend to 'date' in backend
            const { data, ...rest } = stageData;
            if (dbStageName === 'extrusionProduction' || dbStageName === 'printing' || dbStageName === 'cuttingSealing' || dbStageName === 'packagingDispatch') {
                console.log(`Backend: Received noOfRolls for ${dbStageName}:`, rest.noOfRolls);
            }
            machine[dbStageName] = {
                ...rest,
                date: new Date(data)
            };
        } else if (dbStageName === 'packagingDispatch' && req.file) {
            // Handle image update for packagingDispatch
            let pdData = { ...stageData, image: req.file.filename };
            console.log('Backend: Received noOfRolls for packagingDispatch (file upload):', pdData.noOfRolls);
            machine[dbStageName] = pdData;
        } else {
            if (dbStageName === 'extrusionProduction' || dbStageName === 'printing' || dbStageName === 'cuttingSealing' || dbStageName === 'packagingDispatch') {
                console.log(`Backend: Received noOfRolls for ${dbStageName} (direct):`, stageData.noOfRolls);
            }
            machine[dbStageName] = stageData;
        }

        // Add stage to completed stages if not already present (using database stage name)
        if (!machine.completedStages.includes(dbStageName)) {
            machine.completedStages.push(dbStageName);
            console.log('Added stage to completedStages:', dbStageName);
        } else {
            console.log('Stage already in completedStages:', dbStageName);
        }

        console.log('Updated completedStages:', machine.completedStages);

        // Ensure challanNo is generated for packagingDispatch if missing
        if (dbStageName === 'packagingDispatch') {
            if (!machine.packagingDispatch) machine.packagingDispatch = {};
            if (!machine.packagingDispatch.challanNo) {
                const Counter = require('../models/Counter');
                const counter = await Counter.findByIdAndUpdate(
                    'challan_sequence', { $inc: { sequence_value: 1 } }, { new: true, upsert: true }
                );
                machine.packagingDispatch.challanNo = counter.sequence_value;
            }
        }

        // Check if all machines for current stage are completed
        const allMachinesCompleted = po.machines.every(m => m.completedStages.includes(dbStageName));

        await po.save();

        console.log('Machine stage updated successfully');
        console.log('Final machine completedStages:', machine.completedStages);

        // After updating PO, emit event to all admins
        const io = req.app.get('io');
        io.emit('po_updated', { poId });

        res.json({
            message: 'Stage updated successfully',
            machine,
            challanNo: machine.packagingDispatch ? machine.packagingDispatch.challanNo : undefined,
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
router.put('/:poId/machines/:machineId/complete-stage/:stage', auth, async(req, res) => {
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

        // After updating PO, emit event to all admins
        const io = req.app.get('io');
        io.emit('po_updated', { poId });

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
router.put('/:id/complete-stage', auth, async(req, res) => {
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
router.put('/:id/finalize', auth, async(req, res) => {
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
router.get('/:id/pdf', auth, async(req, res) => {
    try {
        const po = await PO.findOne({
            _id: req.params.id,
            createdBy: req.user._id
        });

        if (!po) {
            return res.status(404).json({ message: 'PO not found' });
        }

        // Create PDF document with minimal margin and A4 landscape for maximum compactness
        const doc = new PDFDocument({
            margin: 5, // Minimal margin
            layout: 'landscape',
            size: 'A4' // Use A4 for best fit
        });

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${po.poNumber}.pdf"`);

        // Pipe PDF to response
        doc.pipe(res);

        // --- Compact Heading Table (Single Row) at the very top ---
        const headingRow = [
            { label: 'Purchase Order', value: po.poNumber },
            { label: 'Job Title', value: po.jobTitle },
            { label: 'Date', value: po.createdAt.toDateString() },
            { label: 'Status', value: po.status === 'completed' ? 'Completed' : 'In Progress' },
            { label: 'Current Stage', value: po.getStageDisplayName(po.currentStage) },
            { label: 'Machines', value: `${po.machines.length}/6` },
        ];

        const headingFontSize = 7;
        doc.fontSize(headingFontSize);
        const cellPaddings = 10; // 5px left + 5px right
        const cellHeight = 12;
        // Calculate width for each cell based on text length
        const cellWidths = headingRow.map(cell =>
            doc.widthOfString(`${cell.label}: ${cell.value}`) + cellPaddings
        );
        // Calculate total width and adjust start X if needed (keep at 5 for now)
        let headingTableStartX = 5;
        const headingTableStartY = 5;
        let x = headingTableStartX;
        for (let i = 0; i < headingRow.length; i++) {
            doc.rect(x, headingTableStartY, cellWidths[i], cellHeight).stroke();
            doc.text(`${headingRow[i].label}: ${headingRow[i].value}`, x + 2, headingTableStartY + 2, { width: cellWidths[i] - 4, align: 'left' });
            x += cellWidths[i];
        }
        doc.y = headingTableStartY + cellHeight + 2;

        // Define table structure
        const pageWidth = doc.page.width - 10; // Account for minimal margins
        const colWidths = {
            stage: 80,
            subfield: 70,
            machine: (pageWidth - 150) / 6 // Remaining width divided by 6 machines
        };

        const startX = 5;
        let currentY = doc.y;

        // Helper function to draw table borders
        const drawTableBorder = (x, y, width, height) => {
            doc.rect(x, y, width, height).stroke();
        };

        // Helper function to add text in cell
        const addCellText = (text, x, y, width, height, options = {}) => {
            const fontSize = options.fontSize || 6;
            const align = options.align || 'left';
            doc.fontSize(fontSize);
            // Calculate text position
            const textY = y + (height - fontSize) / 2;
            if (align === 'center') {
                doc.text(text, x, textY, { width: width, align: 'center' });
            } else {
                doc.text(text, x + 1, textY, { width: width - 2, align: align });
            }
        };

        // Draw table headers
        const headerHeight = 12;
        drawTableBorder(startX, currentY, colWidths.stage, headerHeight);
        addCellText('Workflow Stage', startX, currentY, colWidths.stage, headerHeight, { fontSize: 7, align: 'center' });
        drawTableBorder(startX + colWidths.stage, currentY, colWidths.subfield, headerHeight);
        addCellText('Subfield', startX + colWidths.stage, currentY, colWidths.subfield, headerHeight, { fontSize: 7, align: 'center' });
        for (let i = 1; i <= 6; i++) {
            const machineX = startX + colWidths.stage + colWidths.subfield + (i - 1) * colWidths.machine;
            drawTableBorder(machineX, currentY, colWidths.machine, headerHeight);
            addCellText(`S${i}`, machineX, currentY, colWidths.machine, headerHeight, { fontSize: 7, align: 'center' });
        }
        currentY += headerHeight;

        // Define all stages and their subfields
        const stageDefinitions = [
            { name: 'Requirement', subfields: ['Size', 'Micron', 'Bag Type', 'Quantity', 'Print', 'Color', 'Bag film color', 'Packaging Type', 'Material'], dataKey: 'requirement' },
            { name: 'Extrusion Production', subfields: ['Extrusion No.', 'Size', 'Operator Name', 'Ampere', 'Frequency', 'Kgs', 'No. of Rolls', 'Waste', 'QC Approved By', 'Remark'], dataKey: 'extrusionProduction' },
            { name: 'Printing', subfields: ['Machine No.', 'Size', 'Operator Name', 'No. of Rolls', 'Waste', 'Kgs'], dataKey: 'printing' },
            { name: 'Cutting & Sealing', subfields: ['Machine No.', 'Size', 'Operator Name', 'Heating 1', 'Heating 2', 'No. of Rolls', 'Cutting Waste', 'Print Waste', 'Kgs'], dataKey: 'cuttingSealing' },
            { name: 'Punch', subfields: ['Machine No.', 'Bag Size', 'Operator Name', 'Punch Name', 'Kgs', 'Waste'], dataKey: 'punch' },
            { name: 'Packaging & Dispatch', subfields: ['Size', 'Total Weight', 'No. of Rolls', 'No. of Bags', 'Challan No.'], dataKey: 'packagingDispatch' }
        ];

        const rowHeight = 10;

        // Draw table rows
        stageDefinitions.forEach((stage) => {
            stage.subfields.forEach((subfield, subfieldIndex) => {
                // Stage name (only for first subfield of each stage)
                if (subfieldIndex === 0) {
                    drawTableBorder(startX, currentY, colWidths.stage, rowHeight * stage.subfields.length);
                    addCellText(stage.name, startX, currentY, colWidths.stage, rowHeight * stage.subfields.length, { fontSize: 6, align: 'center' });
                }
                // Subfield name
                drawTableBorder(startX + colWidths.stage, currentY, colWidths.subfield, rowHeight);
                addCellText(subfield, startX + colWidths.stage, currentY, colWidths.subfield, rowHeight, { fontSize: 6 });
                // Machine data
                for (let machineNo = 1; machineNo <= 6; machineNo++) {
                    const machineX = startX + colWidths.stage + colWidths.subfield + (machineNo - 1) * colWidths.machine;
                    drawTableBorder(machineX, currentY, colWidths.machine, rowHeight);
                    // Find machine data
                    const machine = po.machines.find(m => m.machineNo === machineNo);
                    let cellValue = '-'; // Changed from 'N/A' to '-'
                    if (machine && machine[stage.dataKey]) {
                        const stageData = machine[stage.dataKey];
                        
                        // Debug logging for all fields in packagingDispatch
                        if (stage.dataKey === 'packagingDispatch') {
                            console.log(`PDF DEBUG - Machine ${machineNo} packagingDispatch:`, stageData);
                        }
                        
                        let fieldKey = subfield.toLowerCase()
                            .replace(/\s+/g, '')
                            .replace(/\./g, '');
                        // Custom mapping for field keys
                        if (subfield.toLowerCase().includes('no. of rolls')) {
                            fieldKey = 'noOfRolls';
                        } else if (subfield.toLowerCase().includes('no. of bags')) {
                            fieldKey = 'noOfBags';
                        } else {
                            fieldKey = fieldKey
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
                                .replace('heating2', 'heating2')
                                .replace('bagfilmcolor', 'bagFilmColor');
                        }
                        
                        // Debug logging for No. of Bags
                        if (subfield.toLowerCase().includes('no. of bags')) {
                            console.log('PDF DEBUG - No. of Bags:', { 
                                machineNo,
                                subfield, 
                                fieldKey, 
                                stageData, 
                                value: stageData[fieldKey],
                                hasValue: stageData[fieldKey] !== undefined && stageData[fieldKey] !== null && stageData[fieldKey] !== ''
                            });
                        }
                        
                        if (stageData[fieldKey] !== undefined && stageData[fieldKey] !== null && stageData[fieldKey] !== '') {
                            cellValue = String(stageData[fieldKey]);
                        }
                    }
                    addCellText(cellValue, machineX, currentY, colWidths.machine, rowHeight, { fontSize: 6 });
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

// Generate and download challan PDF for a machine
router.get('/:poId/machines/:machineId/challan-pdf', auth, async(req, res) => {
    try {
        const { poId, machineId } = req.params;
        const po = await PO.findOne({ _id: poId, createdBy: req.user._id });
        if (!po) return res.status(404).json({ message: 'PO not found' });
        const machine = po.machines.id(machineId);
        if (!machine) return res.status(404).json({ message: 'Machine not found' });
        const stage6 = machine.packagingDispatch;
        if (!stage6 || !stage6.challanNo) return res.status(400).json({ message: 'Challan not available for this machine' });

        // PDF generation - MATCH THE PROVIDED IMAGE FORMAT
        const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'portrait' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=Challan-${stage6.challanNo}.pdf`);
        doc.pipe(res);

        // --- HEADER ---
        doc.font('Helvetica-Bold').fontSize(16).text('DELIVERY CHALLAN', { align: 'center' });
        doc.moveDown(0.2);
        doc.font('Helvetica-Bold').fontSize(14).text('ATHARVA BIO PRODUCTS', { align: 'center' });
        doc.font('Helvetica').fontSize(10).text('Mobile : (+91) 9537905559', { align: 'center' });
        doc.text('Address: 18, Navkar Estate,', { align: 'center' });
        doc.text('B/H. GEB Station, Santej,', { align: 'center' });
        doc.text('Gandhinagar- 382721', { align: 'center' });
        doc.moveDown(0.2);
        doc.font('Helvetica-Bold').fontSize(10).text('GST IN : 24AUCPP6453C1ZU', { align: 'center' });
        doc.moveDown(0.5);
        // --- M/S FIELD ---
        doc.moveDown(0.7);
        doc.font('Helvetica').fontSize(11);
        const infoLeft = 30;
        doc.text(`M/S. ${po.jobTitle || ''}`, infoLeft);
        // --- INFO LINE (D.C. NO., P.O. NO., DATE) ---
        const infoLineY = doc.y;
        // Compose the info line with extra spaces between fields
        const dcNo = `D.C. NO. : ${stage6.challanNo || ''}`;
        const poNo = `P.O. NO. : ${po.poNumber || ''}`;
        const dateStr = `DATE : ${stage6.date ? new Date(stage6.date).toLocaleDateString() : ''}`;
        const infoLine = `${dcNo}        ${poNo}        ${dateStr}`; // 8 spaces between fields
        doc.text(infoLine, infoLeft, infoLineY);
        doc.moveDown(1.5);

        // --- CONSIGNEE & TRANSPORT ---
        doc.text("CONSIGNEE'S GSTIN :", infoLeft, infoLineY + 20);
        doc.text('TRANSPORT MODE   :', infoLeft, infoLineY + 40);
        doc.moveDown(2.5);

        // --- TABLE ---
        const tableTop = infoLineY + 65;
        const colX = [infoLeft, infoLeft + 40, infoLeft + 180, infoLeft + 320, infoLeft + 400, infoLeft + 500];
        const rowHeight = 22;
        // Table header background
        doc.rect(colX[0], tableTop, colX[5] - colX[0], rowHeight).fillAndStroke('#f0f0f0', '#000');
        doc.fillColor('#000').font('Helvetica-Bold').fontSize(11);
        doc.text('Sr No.', colX[0], tableTop + 6, { width: colX[1] - colX[0], align: 'center' });
        doc.text('Description Of Goods', colX[1], tableTop + 6, { width: colX[2] - colX[1], align: 'center' });
        doc.text('Qty.', colX[2], tableTop + 6, { width: colX[3] - colX[2], align: 'center' });
        doc.text('Rate', colX[3], tableTop + 6, { width: colX[4] - colX[3], align: 'center' });
        doc.text('Total Amount', colX[4], tableTop + 6, { width: colX[5] - colX[4], align: 'center' });
        // Table row
        doc.font('Helvetica').fontSize(11).fillColor('#000');
        const rowY = tableTop + rowHeight;
        doc.rect(colX[0], rowY, colX[5] - colX[0], rowHeight).stroke();
        doc.text('1', colX[0], rowY + 6, { width: colX[1] - colX[0], align: 'center' });
        doc.text(`${stage6.size || ''} - ${stage6.noOfBags || ''} Bags`, colX[1], rowY + 6, { width: colX[2] - colX[1], align: 'center' });
        doc.text(stage6.totalWeight != null ? stage6.totalWeight : '', colX[2], rowY + 6, { width: colX[3] - colX[2], align: 'center' });
        doc.text('', colX[3], rowY + 6, { width: colX[4] - colX[3], align: 'center' });
        doc.text('', colX[4], rowY + 6, { width: colX[5] - colX[4], align: 'center' });
        // Draw vertical lines for columns (header + row)
        for (let i = 1; i < colX.length - 1; i++) {
            doc.moveTo(colX[i], tableTop).lineTo(colX[i], rowY + rowHeight).stroke();
        }
        // Draw horizontal lines (bottom of header, bottom of row)
        doc.moveTo(colX[0], tableTop + rowHeight).lineTo(colX[5], tableTop + rowHeight).stroke();
        doc.moveTo(colX[0], rowY + rowHeight).lineTo(colX[5], rowY + rowHeight).stroke();
        doc.moveDown(3);

        // --- FOOTER ---
        doc.font('Helvetica').fontSize(11);
        doc.text('We have Received the above Goods in Order & Good Condition.', infoLeft, rowY + rowHeight + 30);
        doc.moveDown(2);
        doc.text("Receiver's Signature", infoLeft, doc.y);
        doc.text('FOR, ATHARVA BIO PRODUCTS', infoLeft + 350, doc.y);

        doc.end();
    } catch (error) {
        console.error('Challan PDF error:', error);
        res.status(500).json({ message: 'Failed to generate challan PDF' });
    }
});

module.exports = router;