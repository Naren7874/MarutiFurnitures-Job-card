import mongoose from "mongoose";

/* ─────────────────────────────────────────
   PERMISSION SET
   Reusable named bundles of permissions
   Assigned additively on top of a role
───────────────────────────────────────── */
const permissionSetSchema = new mongoose.Schema(
  {
    companyId:   { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name:        { type: String, required: true, trim: true }, // "Warehouse Lead"
    description: String,
    permissions: [{ type: String }],                     // ["inventory.*", "jobcard.production.view"]
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const PermissionSet = mongoose.model("PermissionSet", permissionSetSchema);


/* ─────────────────────────────────────────
   USER PERMISSION
   Per-user record:
     role defaults + permission sets + overrides
     = effectivePermissions (cached)
───────────────────────────────────────── */
const userPermissionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    roleId:    { type: mongoose.Schema.Types.ObjectId, ref: "Role",    required: true },

    // Additional permission sets assigned on top of role
    permissionSetIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "PermissionSet" }],

    // Individual overrides — grant or deny a single permission
    overrides: [
      {
        permission: { type: String, required: true },    // "invoice.create"
        type: {
          type: String,
          enum: ["grant", "deny"],
          required: true,
        },
        expiresAt:  Date,                                // null = permanent
        reason:     String,
        grantedBy:  { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        grantedAt:  { type: Date, default: Date.now },
      },
    ],

    // Cached computed list — rebuilt on every role/override change
    // Priority: user-level deny > user-level grant > role default
    effectivePermissions: [{ type: String }],

    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

userPermissionSchema.index({ userId: 1 }, { unique: true });
userPermissionSchema.index({ companyId: 1 });

export const UserPermission = mongoose.model("UserPermission", userPermissionSchema);
