import mongoose from "mongoose";
/* ─────────────────────────────────────────
   ROLE
   System roles = immutable defaults
   Custom roles = created by super_admin
───────────────────────────────────────── */
const roleSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company" }, // Now optional for global roles

    name: { type: String, required: true, trim: true },  // "Senior Designer", "Warehouse Lead"
    isSystem: { type: Boolean, default: false },          // true = cannot delete

    // All permissions for this role
    // Format: resource.action  e.g. "jobcard.create", "invoice.view"
    permissions: [{ type: String }],

    dataScope: {
      type: String,
      enum: ["own", "department", "all"],
      default: "own",
    },

    isActive:  { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

roleSchema.index({ companyId: 1, name: 1 }, { unique: true });

export const Role = mongoose.model("Role", roleSchema);

