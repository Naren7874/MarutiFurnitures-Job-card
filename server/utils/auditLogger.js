import { AuditLog } from '../models/AuditLog.js'; // ← was missing — this was the bug

/**
 * auditLog — fire-and-forget audit logging helper.
 *
 * Call AFTER a successful DB operation. Never throws — a logging failure
 * must never break a business-critical request.
 *
 * @param {import('express').Request} req - Express request (provides actor + IP context)
 * @param {Object} opts
 * @param {string}  opts.action         - One of the ACTION_ENUM values from AuditLog model
 * @param {string}  [opts.resourceType] - 'User' | 'Role' | 'JobCard' | etc.
 * @param {*}       [opts.resourceId]   - ObjectId of affected document
 * @param {string}  [opts.resourceLabel]- Human-readable label e.g. "MF-26-011" or "John Doe"
 * @param {Object}  [opts.changes]      - { fieldName: { from: oldVal, to: newVal } }
 * @param {Object}  [opts.metadata]     - Any extra context (reason, notes, etc.)
 * @param {Object}  [opts.actor]        - Override actor (for public routes like login where req.user doesn't exist yet)
 *                                        { id, name, role, companyId }
 *
 * @example
 * // On protected routes — uses req.user automatically
 * auditLog(req, { action: 'role_change', ... });
 *
 * // On login — pass user explicitly (req.user not set yet)
 * auditLog(req, { action: 'login', actor: { id: user._id, name: user.name, role: user.role, companyId: user.companyId } });
 */
export const auditLog = (req, { action, resourceType, resourceId, resourceLabel, changes, metadata, actor } = {}) => {
  // If explicit actor is passed (e.g. login route), use it; otherwise fall back to req.user
  const actorId   = actor?.id        || req.user?.userId;
  const actorName = actor?.name      || req.user?.name   || 'System';
  const actorRole = actor?.role      || req.user?.role   || 'unknown';
  const companyId = actor?.companyId || req.user?.companyId;

  AuditLog.create({
    companyId,
    actorId,
    actorName,
    actorRole,
    action,
    resourceType,
    resourceId,
    resourceLabel,
    changes,
    metadata,
    ip:        req.ip || req.socket?.remoteAddress,
    userAgent: req.headers?.['user-agent'],
  }).catch((err) => {
    // Log to server console but never crash the request
    console.error('[AuditLog] Failed to write entry:', err.message, { action, resourceType, resourceLabel });
  });
};
