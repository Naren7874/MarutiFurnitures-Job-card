import mongoose from "mongoose";

/* ─────────────────────────────────────────
   INVENTORY
   Owned by: Store team
   Low stock → auto-alert to Store + super_admin
───────────────────────────────────────── */
const inventorySchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    itemName: { type: String, required: true, trim: true },

    category: {
      type: String,
      enum: ["board", "laminate", "hardware", "fabric", "polish", "glass", "other"],
      required: true,
    },

    unit:         { type: String, required: true },      // "sheets", "sqft", "pcs", "kg", "mtr"
    currentStock: { type: Number, required: true, default: 0 },
    minStock:     { type: Number, required: true, default: 0 }, // alert threshold

    pricePerUnit: { type: Number, default: 0 },
    supplier:     { type: String },

    // Low stock alert flag — set by cron, cleared when stock refilled
    lowStockAlert:   { type: Boolean, default: false },
    lastAlertSentAt: Date,

    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

inventorySchema.index({ companyId: 1, category: 1 });
inventorySchema.index({ companyId: 1, lowStockAlert: 1 });

export const Inventory = mongoose.model("Inventory", inventorySchema);
