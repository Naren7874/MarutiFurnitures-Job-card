import { UserPermission } from '../models/UserPermission.js';
import { AccessLog } from '../models/AccessLog.js';
import { resolvePermissions } from '../utils/resolvePermissions.js';

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
    const userPerm = await UserPermission.findOne({ 
      userId: req.user.userId, 
      companyId: req.user.companyId 
    }).lean();
    
    let effective = userPerm?.effectivePermissions || [];
    
    // Auto-rebuild if cache is empty or missing (stale DB)
    if (effective.length === 0 && !req.user.isSuperAdmin) {
      effective = await resolvePermissions(req.user.userId, req.user.companyId);
    }
    
    const requiredList = Array.isArray(permission) ? permission : [permission];
    const allowed = requiredList.some(p => hasPermission(effective, p));

    // Log the check
    AccessLog.create({ 
      ...logEntry, 
      permission: String(permission),
      result: allowed ? 'allowed' : 'denied' 
    }).catch(() => {});

    if (!allowed) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: ${Array.isArray(permission) ? permission.join(' OR ') : permission}`,
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
    return (r === '*' || r === resource) && (a === '*' || a === action);
  });
};
