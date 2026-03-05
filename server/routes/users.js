import express from 'express';
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
} from '../controllers/users.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = express.Router();

// All user routes require a valid JWT
router.use(authenticateJWT);

// ── List & Create — super_admin only ─────────────────────────────────────────
router.get('/',    requireRole('super_admin'), getUsers);
router.post('/',   requireRole('super_admin'), createUser);

// ── Single user operations ────────────────────────────────────────────────────
router.get('/:id',    requireRole('super_admin'), getUserById);
router.put('/:id',    requireRole('super_admin'), updateUser);
router.delete('/:id', requireRole('super_admin'), deleteUser);

// ── Admin password reset ──────────────────────────────────────────────────────
router.post('/:id/reset-password', requireRole('super_admin'), resetUserPassword);

export default router;
