import { Router } from 'express';
import { authenticateArchitect } from '../middleware/auth.js';
import {
  getArchitectDashboard,
  getArchitectQuotations,
  getArchitectClients,
  getArchitectQuotationById,
} from '../controllers/architect.js';

const router = Router();

// All routes use authenticateArchitect — skips UserPermission company check
router.use(authenticateArchitect);

router.get('/dashboard', getArchitectDashboard);
router.get('/quotations', getArchitectQuotations);
router.get('/quotations/:id', getArchitectQuotationById);
router.get('/clients', getArchitectClients);

export default router;
