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

const router = express.Router();

// All routes require auth
router.use(authenticateJWT);

// ── Role CRUD ─────────────────────────────────────────────────────────────────
// GET (list + detail) accessible to all authenticated users (needed for dropdowns)
router.get('/roles',      getRoles);
router.get('/roles/:id',  getRoleById);

// Mutations require super_admin
router.post('/roles',         requireRole('super_admin'), createRole);
router.put('/roles/:id',      requireRole('super_admin'), updateRole);
router.delete('/roles/:id',   requireRole('super_admin'), deleteRole);

// ── Permission Sets ───────────────────────────────────────────────────────────
router.get('/permission-sets',          requireRole('super_admin'), getPermissionSets);
router.post('/permission-sets',         requireRole('super_admin'), createPermissionSet);
router.put('/permission-sets/:id',      requireRole('super_admin'), updatePermissionSet);
router.delete('/permission-sets/:id',   requireRole('super_admin'), deletePermissionSet);

// ── Access Map & Logs ─────────────────────────────────────────────────────────
router.get('/access-map',                     requireRole('super_admin'), getAccessMap);
router.get('/access-logs',                    requireRole('super_admin'), getAccessLogs);
router.get('/access-logs/export',             requireRole('super_admin'), exportAuditLogs);
router.get('/permission-logs/export',         requireRole('super_admin'), exportPermissionLogs);

// ── Per-User Permission Management ────────────────────────────────────────────
// IMPORTANT: These routes must come AFTER the more specific routes above
//            to avoid ':userId' matching 'access-map', 'access-logs', etc.
router.get('/users/:userId',                            requireRole('super_admin'), getUserPermissions);
router.post('/users/:userId/grant',                     requireRole('super_admin'), grantPermission);
router.post('/users/:userId/deny',                      requireRole('super_admin'), denyPermission);
router.delete('/users/:userId/override/:overrideId',    requireRole('super_admin'), removeOverride);
router.post('/users/:userId/permission-set',            requireRole('super_admin'), assignPermissionSet);
router.delete('/users/:userId/permission-set/:setId',   requireRole('super_admin'), removePermissionSet);
router.get('/users/:userId/history',                    requireRole('super_admin'), getOverrideHistory);

export default router;
