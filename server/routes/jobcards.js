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
  updateJobCard,
  assignJobCard,
} from '../controllers/jobcards.js';
import { authenticateJWT } from '../middleware/auth.js';
import { injectCompanyScope } from '../middleware/scope.js';
import { checkPermission } from '../middleware/permission.js';
import { uploadSingle, handleUploadError } from '../middleware/upload.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

// Stage-specific route modules
import designRoutes from './stages/design.js';
import storeRoutes from './stages/store.js';
import productionRoutes from './stages/production.js';
import qcRoutes from './stages/qc.js';
import dispatchRoutes from './stages/dispatch.js';

const router = express.Router();
router.use(authenticateJWT, injectCompanyScope);

// ── Core Job Card CRUD ───────────────────────────────────────────────────────

router.post('/', checkPermission('jobcard.create'), createJobCard);
router.get('/', checkPermission('jobcard.view'), getJobCards);
router.get('/:id', checkPermission('jobcard.view'), getJobCardById);
router.put('/:id', checkPermission('jobcard.edit'), updateJobCard);
router.get('/:id/pdf', checkPermission('jobcard.view'), getJobCardPDF);

// ── Status Changes (admin only) ──────────────────────────────────────────────

router.patch('/:id/status', checkPermission('jobcard.edit'), updateStatus);
router.patch('/:id/hold', checkPermission('jobcard.edit'), holdJobCard);
router.patch('/:id/cancel', checkPermission('jobcard.edit'), cancelJobCard);
router.patch('/:id/close', checkPermission('jobcard.edit'), closeJobCard);
router.patch('/:id/assign', checkPermission('jobcard.edit'), assignJobCard);

// ── Department Stage Routes (nested) ────────────────────────────────────────

router.use('/:id/design', designRoutes);
router.use('/:id/store', storeRoutes);
router.use('/:id/production', productionRoutes);
router.use('/:id/qc', qcRoutes);
router.use('/:id/dispatch', dispatchRoutes);

// ── Image Upload ─────────────────────────────────────────────────────────────
router.post(
  '/upload-item-photo',
  checkPermission('jobcard.view'),
  uploadSingle,
  handleUploadError,
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
      const result = await uploadToCloudinary(req.file.buffer, 'maruti/jobcard-items');
      res.json({ success: true, url: result.url, publicId: result.publicId });
    } catch (err) {
      next(err);
    }
  }
);

export default router;

