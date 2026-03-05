import { UserPermission } from '../models/UserPermission.js';
import { AccessLog } from '../models/AccessLog.js';

/**
 * checkPermission(permission)
 * Factory middleware — verifies the user has the required permission.
 * Uses cached effectivePermissions from UserPermission collection.
 * Logs every allowed/denied check to AccessLog.
 *
 * Usage on a route:
 *   router.post('/', authenticateJWT, checkPermission('quotation.create'), controller.create)
 *
 * Permission format: 'resource.action'
 *   Examples: 'jobcard.create', 'invoice.view', 'inventory.*'
 */
export const checkPermission = (permission) => async (req, res, next) => {
  // super_admin bypasses all permission checks
  if (req.user?.isSuperAdmin) return next();

  const logEntry = {
    companyId:  req.user?.companyId,
    userId:     req.user?.userId,
    permission,
    resource:   req.originalUrl,
    ip:         req.ip,
    userAgent:  req.headers['user-agent'],
  };

  try {
    const userPerm = await UserPermission.findOne({ userId: req.user.userId }).lean();

    const effective = userPerm?.effectivePermissions || [];
    const allowed = hasPermission(effective, permission);

    // Log the check
    AccessLog.create({ ...logEntry, result: allowed ? 'allowed' : 'denied' }).catch(() => {});

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: ${permission}`,
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

/**
 * Check if a permission string is covered by the effective permissions list.
 * Supports wildcard: 'inventory.*' covers 'inventory.view', 'inventory.create', etc.
 */
const hasPermission = (effectivePermissions, required) => {
  const [resource, action] = required.split('.');
  return effectivePermissions.some((p) => {
    const [r, a] = p.split('.');
    return r === resource && (a === '*' || a === action);
  });
};
