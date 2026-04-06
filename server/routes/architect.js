import { Router } from 'express';
import { authenticateArchitect } from '../middleware/auth.js';
import {
  getArchitectDashboard,
  getArchitectQuotations,
  getArchitectClients,
  getArchitectQuotationById,
  getArchitectProjects,
  getArchitectProjectById,
  getArchitectJobCards,
  getArchitectJobCardById,
} from '../controllers/architect.js';

const router = Router();

// All routes use authenticateArchitect — skips UserPermission company check
router.use(authenticateArchitect);

router.get('/dashboard', getArchitectDashboard);
router.get('/quotations', getArchitectQuotations);
router.get('/quotations/:id', getArchitectQuotationById);
router.get('/clients', getArchitectClients);

router.get('/projects', getArchitectProjects);
router.get('/projects/:id', getArchitectProjectById);

router.get('/jobcards', getArchitectJobCards);
router.get('/jobcards/:id', getArchitectJobCardById);

export default router;
