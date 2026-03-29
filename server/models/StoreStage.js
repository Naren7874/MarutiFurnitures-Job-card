import mongoose from "mongoose";

/* ─────────────────────────────────────────
   STORE STAGE
   Created when: job card status → in_store
   Owner: Store team
───────────────────────────────────────── */
const storeStageSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    jobCardId: { type: mongoose.Schema.Types.ObjectId, ref: "JobCard",  required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project",  required: true },

    bom: [
      {
        inventoryId:  { type: mongoose.Schema.Types.ObjectId, ref: "Inventory" },
        materialName: { type: String, required: true },
        hsnCode:      { type: String },                  // GST HSN for procurement
        required:     { type: Number, required: true },
        unit:         { type: String },                  // "sheets", "sqft", "pcs"
        inStock:      { type: Number, default: 0 },      // pulled at time of check
        shortage:     { type: Number, default: 0 },      // required - inStock (if > 0)
        issued:       { type: Number, default: 0 },
        issuedAt:     Date,
        issuedBy:     { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    purchaseOrderIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "PurchaseOrder" }],

    allMaterialsIssued: { type: Boolean, default: false },
    notes:              String,

    status: {
      type: String,
      enum: ["pending", "po_raised", "material_ready"],
      default: "pending",
    },

    issuedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    issuedAt:  Date,
  },
  { timestamps: true }
);

storeStageSchema.index({ jobCardId: 1 }, { unique: true });

export const StoreStage = mongoose.model("StoreStage", storeStageSchema);
