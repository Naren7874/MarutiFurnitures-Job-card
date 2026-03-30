import mongoose from "mongoose";

/* ─────────────────────────────────────────
   PERMISSION SET
   Reusable named bundles of permissions
   Assigned additively on top of a role
───────────────────────────────────────── */
const permissionSetSchema = new mongoose.Schema(
  {
    companyId:   { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    name:        { type: String, required: true, trim: true },
    description: String,
    permissions: [{ type: String }],
    createdBy:   { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export const PermissionSet = mongoose.model("PermissionSet", permissionSetSchema);


/* ─────────────────────────────────────────
   USER PERMISSION
   Per-user-per-company bridge record:
     - role in this company (roleId)
     - additional permission sets (additive)
     - effectivePermissions cache (rebuilt on change)

   NOTE: Individual overrides (grant/deny) are stored in the
   GLOBAL UserOverride model (no companyId) so they apply
   uniformly across all companies the user belongs to.
───────────────────────────────────────── */
const userPermissionSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    userId:    { type: mongoose.Schema.Types.ObjectId, ref: "User",    required: true },
    role:      { type: String, required: true },
    department: {
      type: String,
      enum: ["sales", "design", "store", "production", "qc", "dispatch", "accounts", "management"],
    },
    roleId:    { type: mongoose.Schema.Types.ObjectId, ref: "Role",    required: true },

    // Additional permission sets assigned on top of role
    permissionSetIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "PermissionSet" }],

    // Cached computed list — rebuilt on every role/override change.
    // Built from: role permissions + permissionSet permissions + global UserOverride entries
    // Priority: global deny > global grant > role default
    effectivePermissions: [{ type: String }],

    updatedAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

userPermissionSchema.index({ userId: 1, companyId: 1 }, { unique: true });
userPermissionSchema.index({ userId: 1 });
userPermissionSchema.index({ companyId: 1 });

export const UserPermission = mongoose.model("UserPermission", userPermissionSchema);
