import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    // Who receives it
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    // What it is about
    quotationId: { type: mongoose.Schema.Types.ObjectId, ref: "Quotation" },
    projectId:   { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    jobCardId:   { type: mongoose.Schema.Types.ObjectId, ref: "JobCard" },

    type: {
      type: String,
      enum: [
        "job_card_created",
        "status_changed",
        "materials_issued",
        "substage_complete",
        "qc_passed",
        "qc_failed",
        "qc_escalated",
        "delivery_scheduled",
        "delivered",
        "job_closed",
        "on_hold",
        "overdue_alert",
        "low_stock_alert",
        "payment_received",
        "payment_overdue",
        "design_signoff_request",
        "general",
      ],
      required: true,
    },

    title:   { type: String, required: true },
    message: { type: String, required: true },

    channel: {
      type: String,
      enum: ["in_app", "whatsapp", "email", "sms"],
      required: true,
    },

    // WhatsApp-specific
    waTemplateName: String,                              // e.g. "qc_failed"
    waVariables:    mongoose.Schema.Types.Mixed,         // { jcNumber, defects, ... }

    isRead:  { type: Boolean, default: false },
    readAt:  Date,
    sentAt:  { type: Date, default: Date.now },

    // Delivery status for external channels
    deliveryStatus: {
      type: String,
      enum: ["pending", "sent", "delivered", "failed"],
      default: "pending",
    },
    failureReason: String,
    retryCount:    { type: Number, default: 0 },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, isRead: 1 });
notificationSchema.index({ companyId: 1, jobCardId: 1 });
notificationSchema.index({ companyId: 1, deliveryStatus: 1 });

// TTL — auto-delete read notifications 24 hours after they are read
notificationSchema.index(
  { readAt: 1 },
  { expireAfterSeconds: 60 * 60 * 24, partialFilterExpression: { isRead: true } }
);

export default mongoose.model("Notification", notificationSchema);