import express from 'express';
import {
  createJobCard,
  getJobCards,
  getJobCardById,
  updateStatus,
  holdJobCard,
  cancelJobCard,
  closeJobCard,
  getJobCardPDF,
} from '../controllers/jobcards.js';
import { authenticateJWT }    from '../middleware/auth.js';
import { injectCompanyScope } from '../middleware/scope.js';
import { checkPermission }    from '../middleware/permission.js';

// Stage-specific route modules
import designRoutes     from './stages/design.js';
import storeRoutes      from './stages/store.js';
import productionRoutes from './stages/production.js';
import qcRoutes         from './stages/qc.js';
import dispatchRoutes   from './stages/dispatch.js';

const router = express.Router();
router.use(authenticateJWT, injectCompanyScope);

// ── Core Job Card CRUD ───────────────────────────────────────────────────────

router.post('/',                checkPermission('jobcard.create'), createJobCard);
router.get('/',                 checkPermission('jobcard.view'),   getJobCards);
router.get('/:id',              checkPermission('jobcard.view'),   getJobCardById);
router.get('/:id/pdf',          checkPermission('jobcard.view'),   getJobCardPDF);

// ── Status Changes (admin only) ──────────────────────────────────────────────

router.patch('/:id/status',     checkPermission('jobcard.edit'),   updateStatus);
router.patch('/:id/hold',       checkPermission('jobcard.edit'),   holdJobCard);
router.patch('/:id/cancel',     checkPermission('jobcard.edit'),   cancelJobCard);
router.patch('/:id/close',      checkPermission('jobcard.edit'),   closeJobCard);

// ── Department Stage Routes (nested) ────────────────────────────────────────

router.use('/:id/design',     designRoutes);
router.use('/:id/store',      storeRoutes);
router.use('/:id/production', productionRoutes);
router.use('/:id/qc',         qcRoutes);
router.use('/:id/dispatch',   dispatchRoutes);

export default router;
