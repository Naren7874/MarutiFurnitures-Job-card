import express from 'express';
import {
  getRoles,
  getRoleById,
  createRole,
  updateRole,
  deleteRole,
} from '../controllers/privileges.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All routes require auth
router.use(authenticateJWT);

// Any authenticated user can view roles (needed for dropdowns)
router.get('/',    getRoles);
router.get('/:id', getRoleById);

// Only super_admin can mutate roles
router.post('/',      requireRole('super_admin'), createRole);
router.put('/:id',    requireRole('super_admin'), updateRole);
router.delete('/:id', requireRole('super_admin'), deleteRole);

export default router;
