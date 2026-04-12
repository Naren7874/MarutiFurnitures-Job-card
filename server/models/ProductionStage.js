import mongoose from "mongoose";

/* ─────────────────────────────────────────
   PRODUCTION STAGE
   Created when: store marks material_ready
   Owner: Production / Workshop team
───────────────────────────────────────── */
const productionStageSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    jobCardId: { type: mongoose.Schema.Types.ObjectId, ref: "JobCard",  required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project",  required: true },

    substages: [
      {
        name: {
          type: String,
          enum: [
            "cutting",
            "edge_banding",
            "cnc_drilling",
            "assembly",
            "polishing",
            "finishing",
            "hardware_fitting",
            "packing",
          ],
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "in_progress", "done"],
          default: "pending",
        },
        workerName:  String,
        startedAt:   Date,
        completedAt: Date,
        notes:       String,
      },
    ],

    progressNotes: [
      {
        note:    { type: String, required: true },
        addedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        addedAt: { type: Date, default: Date.now },
      },
    ],

    estimatedCompletion: Date,
    actualCompletion:    Date,

    status: {
      type: String,
      enum: ["pending", "in_progress", "done"],
      default: "pending",
    },

    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    completedAt: Date,
  },
  { timestamps: true }
);

productionStageSchema.index({ jobCardId: 1 }, { unique: true });

export const ProductionStage = mongoose.model("ProductionStage", productionStageSchema);
