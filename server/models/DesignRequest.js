import mongoose from "mongoose";

/* ─────────────────────────────────────────
   DESIGN REQUEST
   Created when: JobCard is created
   Owner: Design team
   Purpose: Store measurements, material specs,
            CAD files/renders, and client sign-off
───────────────────────────────────────── */
const designRequestSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    jobCardId: { type: mongoose.Schema.Types.ObjectId, ref: "JobCard",  required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project",  required: true },
    clientId:  { type: mongoose.Schema.Types.ObjectId, ref: "Client",   required: true },

    // Per-item design details — maps to JobCard.items by srNo
    items: [
      {
        srNo:        { type: Number, required: true },
        description: { type: String },                    // copied from JobCard item

        measurements: {
          height: { type: Number },                       // in mm/inches as agreed
          width:  { type: Number },
          depth:  { type: Number },
          unit:   { type: String, enum: ["mm", "inch", "cm"], default: "mm" },
          notes:  { type: String },                       // "overall box, excluding legs"
        },

        materials: {
          coreBoard:  String,                             // "BWR Ply 19mm"
          laminate:   String,                             // "Century Code XYZ"
          edgeBand:   String,
          polish:     String,                             // "Natural Teak"
          fabric:     String,
          hardware:   String,
          glassMm:    String,                             // if glass shelf
          notes:      String,
        },

        // Quantity checked by design vs. jobcard
        qty:  { type: Number },
        unit: { type: String, default: "pcs" },

        // Design status per item
        status: {
          type: String,
          enum: ["pending", "in_progress", "ready_for_signoff", "signed_off", "rework"],
          default: "pending",
        },
      },
    ],

    // Uploaded files — CAD drawings, renders, mood boards, PDFs
    files: [
      {
        title:      { type: String },                     // "Reception Sofa — CAD v2"
        url:        { type: String, required: true },     // Cloudinary URL
        fileType:   { type: String, enum: ["cad", "render", "pdf", "image", "other"] },
        version:    { type: Number, default: 1 },
        uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    // Client sign-off
    signoff: {
      status: {
        type: String,
        enum: ["pending", "approved", "rejected", "revision_requested"],
        default: "pending",
      },
      sentAt:       Date,
      respondedAt:  Date,
      approvedBy:   String,                               // client name / confirmation note
      rejectedReason: String,
      revisionNote:   String,
      signatureURL:   String,                             // Cloudinary — digital signature or signed doc
    },

    // Overall status of the design request
    status: {
      type: String,
      enum: ["pending", "in_progress", "submitted_for_signoff", "approved", "rejected"],
      default: "pending",
    },

    notes:       String,
    assignedTo:  [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

designRequestSchema.index({ jobCardId: 1 }, { unique: true });
designRequestSchema.index({ companyId: 1, status: 1 });

export default mongoose.model("DesignRequest", designRequestSchema);
