import express from 'express';
import { createInvoice, getInvoices, getInvoiceById, recordPayment, updatePayment, deletePayment, sendInvoice, getInvoicePDF, updateInvoice, deleteInvoice } from '../controllers/invoices.js';
import { authenticateJWT } from '../middleware/auth.js';
import { injectCompanyScope } from '../middleware/scope.js';
import { checkPermission } from '../middleware/permission.js';

const router = express.Router();
router.use(authenticateJWT, injectCompanyScope);

router.post('/',               checkPermission('invoice.create'),  createInvoice);
router.get('/',                checkPermission('invoice.view'),    getInvoices);
router.get('/:id',             checkPermission('invoice.view'),    getInvoiceById);
router.patch('/:id',           checkPermission('invoice.edit'),    updateInvoice);
router.delete('/:id',          checkPermission('invoice.delete'),  deleteInvoice);
router.get('/:id/pdf',         checkPermission('invoice.view'),    getInvoicePDF);
router.patch('/:id/send',      checkPermission('invoice.edit'),    sendInvoice);
router.post('/:id/payment',    checkPermission('invoice.payment'), recordPayment);
router.patch('/:id/payment/:paymentId', checkPermission('invoice.payment'), updatePayment);
router.delete('/:id/payment/:paymentId', checkPermission('invoice.payment'), deletePayment);

export default router;
