import express from 'express';
import {
  createQuotation,
  getQuotations,
  getQuotationById,
  updateQuotation,
  sendQuotationPDF,
  approveQuotation,
  rejectQuotation,
  reviseQuotation,
  getQuotationPDF,
  assignStaffToQuotation,
  updateQuotationJobCardTeams,
  deleteQuotation,
  updateCommissionPaid,
} from '../controllers/quotations.js';
import { authenticateJWT }    from '../middleware/auth.js';
import { injectCompanyScope } from '../middleware/scope.js';
import { checkPermission }    from '../middleware/permission.js';
import { uploadSingle, handleUploadError } from '../middleware/upload.js';
import { uploadToCloudinary } from '../config/cloudinary.js';

const router = express.Router();
router.use(authenticateJWT, injectCompanyScope);

router.post('/',                  checkPermission('quotation.create'), createQuotation);
router.get('/',                   checkPermission('quotation.view'),   getQuotations);
router.get('/:id',                checkPermission('quotation.view'),   getQuotationById);
router.put('/:id',                checkPermission('quotation.edit'),   updateQuotation);
router.get('/:id/pdf',            checkPermission('quotation.view'),   getQuotationPDF);
router.patch('/:id/send',         checkPermission('quotation.send'),   sendQuotationPDF);
router.patch('/:id/approve',      checkPermission('quotation.edit'),   approveQuotation);
router.patch('/:id/reject',       checkPermission('quotation.edit'),   rejectQuotation);
router.post('/:id/revise',        checkPermission('quotation.create'), reviseQuotation);
router.delete('/:id',              checkPermission('quotation.delete'), deleteQuotation);
router.patch('/:id/commission-paid', checkPermission('quotation.edit'),   updateCommissionPaid);

// ── Assign Staff to Quotation ──────────────────────────────────
router.patch('/:id/assign-staff', checkPermission('jobcard.assign'),   assignStaffToQuotation);
router.patch('/:id/jobcard-teams', checkPermission('jobcard.assign'),   updateQuotationJobCardTeams);

// ── Image Upload ───────────────────────────────────────────────
// Accepts: multipart/form-data with field 'file'
// Returns: { url, publicId }
router.post(
  '/upload-item-photo',
  checkPermission('quotation.create'),
  uploadSingle,
  handleUploadError,
  async (req, res, next) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
      const result = await uploadToCloudinary(req.file.buffer, 'maruti/quotation-items');
      res.json({ success: true, url: result.url, publicId: result.publicId });
    } catch (err) {
      next(err);
    }
  }
);


export default router;
