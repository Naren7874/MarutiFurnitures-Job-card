import mongoose from "mongoose";

const itemSchema = new mongoose.Schema(
  {
    srNo:        { type: Number, required: true },
    category:    { type: String },
    description: { type: String },
    photo:       { type: String },                       // Cloudinary URL — primary design image
    fabricPhoto: { type: String },                       // Secondary photo for fabric/texture
    photos:      [{ type: String }],                    // All extra reference photos from quotation

    specifications: {
      size:     String,
      polish:   String,
      fabric:   String,                                  // legacy single fabric
      fabrics:  [{ type: String }],                      // NEW — multiple fabric names
      material: String,
      finish:   String,
      hardware: String,
      notes:    String,
    },
    qty:  { type: Number, required: true },
    unit: { type: String, default: "pcs" },
  },
  { _id: true }
);

const activityLogSchema = new mongoose.Schema(
  {
    action:     { type: String, required: true },        // "status_changed", "staff_assigned"
    doneBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    doneByName: { type: String },
    prevStatus: { type: String },
    newStatus:  { type: String },
    note:       { type: String },
    timestamp:  { type: Date, default: Date.now },
  },
  { _id: false }
);

const jobCardSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    jobCardNumber: { type: String, unique: true },       // Auto: MF-26-011

    // Origins — full traceability
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",                                  // full traceability back to quotation
    },
    designRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "DesignRequest",                              // design measurements, files, client sign-off
    },

    // What is being made
    title: { type: String, required: true },             // "Reception Area Sofas"
    items: [itemSchema],

    // People
    salesperson: {
      id:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: String,
    },
    contactPerson: { type: String },
    assignedTo: {
      design:     [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      store:      [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      production: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      qc:         [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      dispatch:   [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
      accountant: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    },

    // Single source of truth for job status
    status: {
      type: String,
      enum: [
        "active",          // created, WA group set up
        "in_store",        // store checking BOM
        "material_ready",  // all materials issued
        "in_production",   // manufacturing started
        "qc_pending",      // production done, awaiting QC
        "qc_failed",       // QC failed → back to production
        "qc_passed",       // QC passed → dispatch
        "dispatched",      // items dispatched
        "delivered",       // proof of delivery captured
        "closed",          // admin closed + archived
        "on_hold",         // paused at any stage
        "cancelled",       // cancelled with reason
      ],
      default: "active",
    },

    // WhatsApp group — created manually by super_admin on phone
    whatsapp: {
      groupName:      String,                            // "MF-26-011 | GMP Office | Ram Tiwari"
      groupId:        String,                            // BSP group ID (pasted by admin)
      groupLink:      String,                            // WA invite link
      groupCreatedAt: Date,
      groupCreatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    // Stage document refs — created one-by-one as job progresses
    storeStageId:      { type: mongoose.Schema.Types.ObjectId, ref: "StoreStage" },
    productionStageId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductionStage" },
    qcStageId:         { type: mongoose.Schema.Types.ObjectId, ref: "QcStage" },
    dispatchStageId:   { type: mongoose.Schema.Types.ObjectId, ref: "DispatchStage" },

    // Dates
    orderDate:        { type: Date, default: Date.now },
    expectedDelivery: { type: Date },
    actualDelivery:   { type: Date },

    // Priority
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    // Hold / cancel
    onHoldReason: String,
    onHoldAt:     Date,
    cancelReason: String,
    cancelledAt:  Date,

    // Closure notes
    warrantyNotes:  String,
    punchListItems: [String],
    closedBy:       { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    closedAt:       Date,

    // Template support
    isTemplate:   { type: Boolean, default: false },
    templateName: String,

    // Immutable audit trail
    activityLog: [activityLogSchema],

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

jobCardSchema.index({ companyId: 1, status: 1 });
jobCardSchema.index({ companyId: 1, projectId: 1 });
jobCardSchema.index({ companyId: 1, priority: 1 });
jobCardSchema.index({ companyId: 1, expectedDelivery: 1 });

export default mongoose.model("JobCard", jobCardSchema);