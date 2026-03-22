import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  changeUserRole,
  deactivateUser,
  activateUser,
  resetUserPassword,
} from '../controllers/users.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permission.js';

const router = express.Router();

// All user routes require a valid JWT
router.use(authenticateJWT);

// ── List & Create ─────────────────────────────────────────────────────────────
router.get('/',    checkPermission('user.view'),   getUsers);
router.post('/',   checkPermission('user.create'), createUser);

// ── Single user operations ─────────────────────────────────────────────────────
router.get('/:id',    checkPermission('user.view'), getUserById);
router.put('/:id',    checkPermission('user.edit'), updateUser);
router.delete('/:id', checkPermission('user.delete'), deleteUser);

// ── Lifecycle ─────────────────────────────────────────────────────────────────
router.patch('/:id/role',       checkPermission('user.edit'),       changeUserRole);
router.patch('/:id/deactivate', checkPermission('user.deactivate'), deactivateUser);
router.patch('/:id/activate',   checkPermission('user.deactivate'), activateUser);

// ── Admin password reset ──────────────────────────────────────────────────────
router.post('/:id/reset-password', checkPermission('user.edit'), resetUserPassword);

export default router;
