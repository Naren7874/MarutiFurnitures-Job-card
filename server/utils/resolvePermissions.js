import { UserPermission } from '../models/UserPermission.js';
import { Role } from '../models/Role.js';
import UserOverride from '../models/UserOverride.js';

/**
 * Compute the final set of effective permissions for a user in a given company context.
 *
 * Priority (highest → lowest):
 *   1. Global DENY overrides (UserOverride.type === 'deny')   — removes the permission
 *   2. Global GRANT overrides (UserOverride.type === 'grant') — adds the permission
 *   3. PermissionSet permissions (additive bundles)
 *   4. Role default permissions
 *
 * Overrides are stored in the global UserOverride collection (no companyId),
 * so they apply uniformly to the user across all companies.
 *
 * @param {string} userId    - Mongoose ObjectId string
 * @param {string} companyId - Mongoose ObjectId string (specific company context)
 * @returns {string[]}       - Sorted array of effective permission strings
 */
export const resolvePermissions = async (userId, companyId) => {
  const query = { userId };
  if (companyId) query.companyId = companyId;

  // 1. Get the per-company permission record (role + permission sets)
  const record = await UserPermission.findOne(query)
    .populate('roleId')
    .populate('permissionSetIds')
    .lean();

  if (!record) return [];

  const now = new Date();

  // 2. Start with role defaults
  const base = new Set(record.roleId?.permissions || []);

  // 3. Add all PermissionSet permissions
  for (const ps of record.permissionSetIds || []) {
    for (const p of ps.permissions || []) base.add(p);
  }

  // 4. Apply GLOBAL overrides from UserOverride collection
  const overrides = await UserOverride.find({ userId }).lean();
  for (const override of overrides) {
    // Skip expired overrides
    if (override.expiresAt && override.expiresAt < now) continue;

    if (override.type === 'grant') base.add(override.permission);
    if (override.type === 'deny')  base.delete(override.permission);
  }

  const effective = [...base].sort();

  // 5. Cache in DB (async, don't await — let it save in background)
  UserPermission.findOneAndUpdate(
    query,
    { effectivePermissions: effective, updatedAt: now }
  ).catch(() => {});

  return effective;
};

/**
 * Rebuild effectivePermissions for ALL company records of a user.
 * Call this after any override or role change.
 * @param {string} userId
 */
export const rebuildAllPermissions = async (userId) => {
  const allRecords = await UserPermission.find({ userId }).lean();
  for (const record of allRecords) {
    if (record.companyId) {
      await resolvePermissions(userId, record.companyId.toString());
    }
  }
};

/**
 * Alias kept for backward compatibility.
 * @deprecated Use rebuildAllPermissions for global consistency.
 */
export const rebuildPermissions = async (userId, companyId) => {
  const effective = await resolvePermissions(userId, companyId);
  return effective;
};
