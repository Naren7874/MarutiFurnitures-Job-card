import mongoose from "mongoose";

/* ─────────────────────────────────────────
   ACCESS LOG
   Every permission check is logged
   (both allowed and denied)
   Used for security audit + anomaly detection
───────────────────────────────────────── */
const accessLogSchema = new mongoose.Schema({
  companyId:  { type: mongoose.Schema.Types.ObjectId, ref: "Company" },
  userId:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  permission: { type: String },                          // "jobcard.create"
  resource:   { type: String },                          // "/api/jobcards"
  result: {
    type: String,
    enum: ["allowed", "denied"],
  },
  ip:        String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now },
});

// TTL index — auto-delete logs older than 90 days
accessLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });
accessLogSchema.index({ companyId: 1, userId: 1 });

export const AccessLog = mongoose.model("AccessLog", accessLogSchema);