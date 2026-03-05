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
} from '../controllers/quotations.js';
import { authenticateJWT }    from '../middleware/auth.js';
import { injectCompanyScope } from '../middleware/scope.js';
import { checkPermission }    from '../middleware/permission.js';

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

export default router;
