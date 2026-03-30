import mongoose from 'mongoose';

/**
 * UserOverride — Global permission override for a user.
 *
 * Unlike UserPermission (which is per-company), overrides are GLOBAL —
 * they apply across ALL companies the user belongs to.
 *
 * Priority in resolvePermissions: deny > grant > role > permission sets
 */
const userOverrideSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    permission: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['grant', 'deny'],
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    expiresAt: {
      type: Date,
      default: null, // null = permanent
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

// One override per (userId + permission) — prevents conflicting duplicates
userOverrideSchema.index({ userId: 1, permission: 1 }, { unique: true });
userOverrideSchema.index({ userId: 1 });

const UserOverride = mongoose.model('UserOverride', userOverrideSchema);
export default UserOverride;
