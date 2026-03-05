import { UserPermission } from '../models/UserPermission.js';
import { Role } from '../models/Role.js';

/**
 * Compute the final set of effective permissions for a user.
 *
 * Priority (highest → lowest):
 *   1. User-level DENY overrides (removes the permission)
 *   2. User-level GRANT overrides (adds the permission, if not expired)
 *   3. PermissionSet permissions (additive bundles)
 *   4. Role default permissions
 *
 * @param {string} userId - Mongoose ObjectId string
 * @returns {string[]}    - Sorted array of effective permission strings
 */
export const resolvePermissions = async (userId) => {
  const record = await UserPermission.findOne({ userId })
    .populate('roleId')
    .populate('permissionSetIds')
    .lean();

  if (!record) return [];

  const now = new Date();

  // 1. Start with role defaults
  const base = new Set(record.roleId?.permissions || []);

  // 2. Add all PermissionSet permissions
  for (const ps of record.permissionSetIds || []) {
    for (const p of ps.permissions || []) base.add(p);
  }

  // 3. Apply overrides
  for (const override of record.overrides || []) {
    // Skip expired overrides
    if (override.expiresAt && override.expiresAt < now) continue;

    if (override.type === 'grant') base.add(override.permission);
    if (override.type === 'deny')  base.delete(override.permission);
  }

  const effective = [...base].sort();

  // 4. Cache in DB (async, don't await — let it save in background)
  UserPermission.findOneAndUpdate(
    { userId },
    { effectivePermissions: effective, updatedAt: now }
  ).catch(() => {});

  return effective;
};

/**
 * Rebuild and cache effectivePermissions for a user (call after role change or override change)
 * @param {string} userId
 */
export const rebuildPermissions = async (userId) => {
  const effective = await resolvePermissions(userId);
  return effective;
};
