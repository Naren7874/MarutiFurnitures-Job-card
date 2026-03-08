import mongoose from "mongoose";
/* ─────────────────────────────────────────
   PURCHASE ORDER
   Created by: Store when inventory is short
   Linked to: job card + inventory items
───────────────────────────────────────── */
const purchaseOrderSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },

    poNumber: { type: String, unique: true },            // Auto: MF-PO-2026-001

    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    jobCardId: { type: mongoose.Schema.Types.ObjectId, ref: "JobCard" },

    items: [
      {
        inventoryId:  { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
        materialName: { type: String, required: true },
        qty:          { type: Number, required: true },
        unit:         String,
        pricePerUnit: Number,
        totalPrice:   Number,
      },
    ],

    supplier:    { type: String },
    totalAmount: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["raised", "ordered", "received", "cancelled"],
      default: "raised",
    },

    expectedDate: Date,
    receivedDate: Date,
    notes:        String,

    // Approval workflow — high-value POs require super_admin sign-off
    requiresApproval: { type: Boolean, default: false },
    approvedBy:       { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    approvedAt:       { type: Date },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

purchaseOrderSchema.pre("save", function () {
  this.items.forEach((item) => {
    item.totalPrice = (item.qty || 0) * (item.pricePerUnit || 0);
  });
  this.totalAmount = this.items.reduce((sum, i) => sum + (i.totalPrice || 0), 0);
});

purchaseOrderSchema.index({ companyId: 1, status: 1 });

export const PurchaseOrder = mongoose.model("PurchaseOrder", purchaseOrderSchema);