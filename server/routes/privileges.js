import express from 'express';
import {
  // Role CRUD
  getRoles, getRoleById, createRole, updateRole, deleteRole,
  // PermissionSet CRUD
  getPermissionSets, createPermissionSet, updatePermissionSet, deletePermissionSet,
  // Per-user permission management
  getUserPermissions, grantPermission, denyPermission, removeOverride,
  assignPermissionSet, removePermissionSet, getOverrideHistory,
  // Access map + logs
  getAccessMap, getAccessLogs, exportAuditLogs, exportPermissionLogs,
} from '../controllers/privileges.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permission.js';

const router = express.Router();

// All routes require auth
router.use(authenticateJWT);

// ── Role CRUD ─────────────────────────────────────────────────────────────────
// GET (list + detail) accessible to all authenticated users (needed for dropdowns)
router.get('/roles',      getRoles);
router.get('/roles/:id',  getRoleById);

// Mutations require specific permissions
router.post('/roles',         checkPermission('privilege.create'), createRole);
router.put('/roles/:id',      checkPermission('privilege.edit'),   updateRole);
router.delete('/roles/:id',   checkPermission('privilege.delete'), deleteRole);

// ── Permission Sets ───────────────────────────────────────────────────────────
router.get('/permission-sets',          checkPermission('privilege.view'),   getPermissionSets);
router.post('/permission-sets',         checkPermission('privilege.create'), createPermissionSet);
router.put('/permission-sets/:id',      checkPermission('privilege.edit'),   updatePermissionSet);
router.delete('/permission-sets/:id',   checkPermission('privilege.delete'), deletePermissionSet);

// ── Access Map & Logs ─────────────────────────────────────────────────────────
router.get('/access-map',                     checkPermission('audit_log.view'), getAccessMap);
router.get('/access-logs',                    checkPermission('audit_log.view'), getAccessLogs);
router.get('/access-logs/export',             checkPermission('audit_log.export'), exportAuditLogs);
router.get('/permission-logs/export',         checkPermission('audit_log.export'), exportPermissionLogs);

// ── Per-User Permission Management ────────────────────────────────────────────
// IMPORTANT: These routes must come AFTER the more specific routes above
//            to avoid ':userId' matching 'access-map', 'access-logs', etc.
router.get('/users/:userId',                            checkPermission('privilege.view'), getUserPermissions);
router.post('/users/:userId/grant',                     checkPermission('privilege.grant'), grantPermission);
"privileges.js"
router.post('/users/:userId/deny',                      checkPermission('privilege.deny'), denyPermission);
router.delete('/users/:userId/override/:overrideId',    checkPermission(['privilege.grant', 'privilege.deny']), removeOverride);
router.post('/users/:userId/permission-set',            checkPermission('privilege.grant'), assignPermissionSet);
router.delete('/users/:userId/permission-set/:setId',   checkPermission(['privilege.grant', 'privilege.deny']), removePermissionSet);
router.get('/users/:userId/history',                    checkPermission('privilege.view'), getOverrideHistory);

export default router;
