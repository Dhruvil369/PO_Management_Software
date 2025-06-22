const mongoose = require('mongoose');

// Requirement Schema
const requirementSchema = new mongoose.Schema({
    machineNo: {
        type: Number,
        required: true,
        min: 1,
        max: 6
    },
    size: String,
    micron: String,
    bagType: String,
    quantity: Number,
    print: String,
    color: String,
    packagingType: String,
    material: String,
    image: String, // File path for uploaded image
    date: Date
});

// Extrusion Production Schema
const extrusionProductionSchema = new mongoose.Schema({
    extrusionNo: String,
    size: String,
    operatorName: String,
    ampere: Number,
    frequency: Number,
    kgs: Number,
    noOfRolls: Number,
    waste: Number,
    qcApprovedBy: String,
    remark: String,
    date: Date // <-- add date field
});

// Printing Schema
const printingSchema = new mongoose.Schema({
    machineNo: Number,
    size: String,
    operatorName: String,
    noOfRolls: Number,
    waste: Number,
    kgs: Number,
    date: Date // <-- add date field
});

// Cutting & Sealing Schema
const cuttingSealingSchema = new mongoose.Schema({
    machineNo: Number,
    size: String,
    operatorName: String,
    heating1: Number,
    heating2: Number,
    noOfRolls: Number,
    cuttingWaste: Number,
    printWaste: Number,
    kgs: Number,
    date: Date // <-- add date field
});

// Punch Schema
const punchSchema = new mongoose.Schema({
    machineNo: Number,
    bagSize: String,
    operatorName: String,
    punchName: String,
    kgs: Number,
    waste: Number,
    date: Date // <-- add date field
});

// Packaging & Dispatch Schema
const packagingDispatchSchema = new mongoose.Schema({
    size: String,
    totalWeight: Number,
    noOfRolls: Number,
    noOfBags: Number,
    challanNo: String,
    date: Date, // <-- add date field
    image: String // File path for uploaded image
});

// Machine Entry Schema (contains all 6 stages)
const machineEntrySchema = new mongoose.Schema({
    machineNo: {
        type: Number,
        required: true,
        min: 1,
        max: 6
    },
    requirement: requirementSchema,
    extrusionProduction: extrusionProductionSchema,
    printing: printingSchema,
    cuttingSealing: cuttingSealingSchema,
    punch: punchSchema,
    packagingDispatch: packagingDispatchSchema,
    completedStages: {
        type: [String],
        default: []
    },
    isCompleted: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Main PO Schema
const poSchema = new mongoose.Schema({
    poNumber: {
        type: String,
        required: true,
        unique: true
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    machines: [machineEntrySchema],
    currentStage: {
        type: String,
        enum: ['requirement', 'extrusion', 'printing', 'cutting', 'punch', 'packaging', 'completed'],
        default: 'requirement'
    },
    status: {
        type: String,
        enum: ['draft', 'in-progress', 'completed'],
        default: 'draft'
    },
    stageCompletedAt: {
        requirement: Date,
        extrusion: Date,
        printing: Date,
        cutting: Date,
        punch: Date,
        packaging: Date
    },
    isFinalized: {
        type: Boolean,
        default: false
    },
    jobTitle: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

// Method to get next available machine numbers
poSchema.methods.getAvailableMachineNumbers = function() {
    const usedMachines = this.machines.map(machine => machine.machineNo);
    const allMachines = [1, 2, 3, 4, 5, 6];
    return allMachines.filter(num => !usedMachines.includes(num));
};

// Method to check if PO can accept more machines
poSchema.methods.canAddMoreMachines = function() {
    return this.machines.length < 6;
};

// Method to get next stage
poSchema.methods.getNextStage = function() {
    const stageOrder = ['requirement', 'extrusion', 'printing', 'cutting', 'punch', 'packaging', 'completed'];
    const currentIndex = stageOrder.indexOf(this.currentStage);
    return currentIndex < stageOrder.length - 1 ? stageOrder[currentIndex + 1] : 'completed';
};

// Method to advance to next stage
poSchema.methods.advanceToNextStage = function() {
    const nextStage = this.getNextStage();
    this.currentStage = nextStage;

    // Mark stage completion time
    if (!this.stageCompletedAt) {
        this.stageCompletedAt = {};
    }
    this.stageCompletedAt[this.currentStage] = new Date();

    // Update status
    if (nextStage === 'completed') {
        this.status = 'completed';
        this.isFinalized = true;
    } else if (this.status === 'draft') {
        this.status = 'in-progress';
    }
};

// Method to check if stage is editable
poSchema.methods.isStageEditable = function(stage) {
    return this.currentStage === stage && this.currentStage !== 'completed';
};

// Method to get stage display name
poSchema.methods.getStageDisplayName = function(stage) {
    const stageNames = {
        requirement: 'Requirement',
        extrusion: 'Extrusion Production',
        printing: 'Printing',
        cutting: 'Cutting & Sealing',
        punch: 'Punch',
        packaging: 'Packaging & Dispatch',
        completed: 'Completed'
    };
    return stageNames[stage] || stage;
};

module.exports = mongoose.model('PO', poSchema);