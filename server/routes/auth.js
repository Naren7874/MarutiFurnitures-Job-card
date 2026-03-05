import express from 'express';
import {
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
  switchCompany,
} from '../controllers/auth.js';
import { authenticateJWT } from '../middleware/auth.js';

const router = express.Router();

// ── Public routes ────────────────────────────────────────────────────────────

router.post('/login',          login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

// ── Authenticated routes ─────────────────────────────────────────────────────

router.post('/logout',          authenticateJWT, logout);
router.get('/me',               authenticateJWT, getMe);
router.post('/switch-company',  authenticateJWT, switchCompany);

export default router;
