import express from 'express';
const router = express.Router();
import { authenticateJWT } from '../middleware/auth.js';
import { injectCompanyScope } from '../middleware/scope.js';
import { checkPermission } from '../middleware/permission.js';
import {
  getFinancialReport,
  getOutstandingReport,
  getProductionReport,
  getDeliveryReport,
  exportReport,
  getDashboardStats,
} from '../controllers/reports.js';

router.use(authenticateJWT, injectCompanyScope);

router.get('/dashboard-stats', checkPermission(['reports.view_financial', 'reports.view_production', 'reports.view_delivery']), getDashboardStats);
router.get('/financial',  checkPermission('reports.view_financial'),  getFinancialReport);
router.get('/outstanding', checkPermission('reports.view_financial'), getOutstandingReport);
router.get('/production', checkPermission('reports.view_production'), getProductionReport);
router.get('/delivery',   checkPermission('reports.view_delivery'),   getDeliveryReport);
router.get('/export',     checkPermission('reports.export'),          exportReport);

export default router;
