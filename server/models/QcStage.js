import mongoose from "mongoose";

/* ─────────────────────────────────────────
   QC STAGE
   Created when: production marks done
   Owner: QC team
───────────────────────────────────────── */
const qcStageSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    jobCardId: { type: mongoose.Schema.Types.ObjectId, ref: "JobCard",  required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project",  required: true },

    checklist: [
      {
        parameter: { type: String, required: true },     // "Dimensions", "Finish Quality"
        passed:    Boolean,
        notes:     String,
      },
    ],

    defectPhotos: [
      {
        url:        String,                              // Cloudinary URL
        annotation: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],

    verdict: {
      type: String,
      enum: ["pass", "fail"],
    },

    reworkCount:   { type: Number, default: 0 },
    reworkHistory: [
      {
        failReason:    String,
        defectSummary: String,                           // used in WA qc_failed template {{Defects}}
        sentBackAt:    Date,
        sentBackBy:    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        resolvedAt:    Date,
      },
    ],

    // Escalate to super_admin if rework > 2
    escalated:   { type: Boolean, default: false },
    escalatedAt: Date,

    certificateURL: String,                              // QC Pass PDF — Cloudinary URL

    inspectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    inspectedAt: Date,
  },
  { timestamps: true }
);

qcStageSchema.index({ jobCardId: 1 }, { unique: true });

export const QcStage = mongoose.model("QcStage", qcStageSchema);
