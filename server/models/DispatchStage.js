import mongoose from "mongoose";

/* ─────────────────────────────────────────
   DISPATCH STAGE
   Created when: QC marks pass
   Owner: Dispatch team
───────────────────────────────────────── */
const dispatchStageSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    jobCardId: { type: mongoose.Schema.Types.ObjectId, ref: "JobCard",  required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project",  required: true },

    scheduledDate: Date,
    timeSlot:      String,                               // "10:00 AM – 12:00 PM"

    // Injected into WA delivery_scheduled: {{Driver}}
    deliveryTeam: [
      {
        name:  String,
        phone: String,
        role:  String,                                   // "Driver", "Helper"
      },
    ],

    itemsDispatched: [
      {
        srNo:         Number,
        description:  String,
        qty:          Number,
        dispatchedAt: Date,
      },
    ],

    proofOfDelivery: {
      photo:       String,                               // Cloudinary — installed furniture photo
      signature:   String,                               // Cloudinary — client digital signature
      gpsLocation: String,
      capturedAt:  Date,
    },

    clientNotifiedAt: Date,                              // when WA delivery_scheduled was sent

    status: {
      type: String,
      enum: ["scheduled", "dispatched", "delivered"],
      default: "scheduled",
    },

    deliveredBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    deliveredByName: String,
    deliveredAt: Date,
  },
  { timestamps: true }
);

dispatchStageSchema.index({ jobCardId: 1 }, { unique: true });

export const DispatchStage = mongoose.model("DispatchStage", dispatchStageSchema);
