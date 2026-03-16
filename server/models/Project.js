import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    projectNumber: { type: String, unique: true },       // Auto: MF-PRJ-2026-001

    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    quotationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quotation",                                  // project born from approved quotation
    },

    // Copied from Quotation on creation — stands alone even if quotation is revised
    projectName:  { type: String, required: true, trim: true },
    architect:    { type: String },                      // "Ar. Dreamscape"
    architectContact: { type: String },                  // architect's phone/email
    projectDesigner: { type: String },
    projectDesignerContact: { type: String },            // designer's phone/email
    siteAddress: {
      location: String,
      line1:    String,
      line2:    String,
      pincode:  String,
    },
    contactPerson: { type: String },
    salesPerson: {
      id:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      name: String,
    },

    // GST context (copied at creation for reporting)
    clientGstin: { type: String },

    status: {
      type: String,
      enum: [
        "enquiry",
        "quotation_sent",
        "approved",
        "active",
        "on_hold",
        "completed",
        "cancelled",
      ],
      default: "enquiry",
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    expectedDelivery: { type: Date },
    actualDelivery:   { type: Date },

    // WhatsApp group — created manually by super_admin
    whatsapp: {
      groupName:      String,                            // "MF-26-011 | GMP Office | Ram Tiwari"
      groupId:        String,                            // BSP group ID
      groupLink:      String,                            // WA invite link
      groupCreatedAt: Date,
      groupCreatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },

    // All staff assigned to this project across all departments
    assignedStaff: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],

    referenceImages: [{ type: String }],                 // Cloudinary URLs
    notes:           { type: String },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

projectSchema.index({ companyId: 1, status: 1 });
projectSchema.index({ companyId: 1, clientId: 1 });

export default mongoose.model("Project", projectSchema);