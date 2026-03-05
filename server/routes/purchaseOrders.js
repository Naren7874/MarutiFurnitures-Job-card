import express from 'express';
import { createPO, getPOs, approvePO, receivePO } from '../controllers/purchaseOrders.js';
import { authenticateJWT } from '../middleware/auth.js';
import { injectCompanyScope } from '../middleware/scope.js';
import { checkPermission } from '../middleware/permission.js';

const router = express.Router();
router.use(authenticateJWT, injectCompanyScope);

router.post('/',                checkPermission('purchaseOrder.create'), createPO);
router.get('/',                 checkPermission('purchaseOrder.view'),   getPOs);
router.patch('/:id/approve',    checkPermission('purchaseOrder.edit'),   approvePO);
router.patch('/:id/receive',    checkPermission('purchaseOrder.edit'),   receivePO);

export default router;
