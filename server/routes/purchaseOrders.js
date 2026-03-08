import express from 'express';
import { createPO, getPOs, getPOById, approvePO, receivePO, cancelPO } from '../controllers/purchaseOrders.js';
import { authenticateJWT } from '../middleware/auth.js';
import { injectCompanyScope } from '../middleware/scope.js';
import { checkPermission } from '../middleware/permission.js';

const router = express.Router();
router.use(authenticateJWT, injectCompanyScope);

router.post('/',                checkPermission('purchaseOrder.create'),  createPO);
router.get('/',                 checkPermission('purchaseOrder.view'),    getPOs);
router.get('/:id',              checkPermission('purchaseOrder.view'),    getPOById);
router.patch('/:id/approve',    checkPermission('purchaseOrder.approve'), approvePO);
router.patch('/:id/receive',    checkPermission('purchaseOrder.edit'),    receivePO);
router.patch('/:id/cancel',     checkPermission('purchaseOrder.edit'),    cancelPO);

export default router;
