import express from 'express';
import {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deactivateClient,
} from '../controllers/clients.js';
import { authenticateJWT }    from '../middleware/auth.js';
import { injectCompanyScope } from '../middleware/scope.js';
import { checkPermission }    from '../middleware/permission.js';

const router = express.Router();

// All client routes are authenticated + company-scoped
router.use(authenticateJWT, injectCompanyScope);

router.post('/',          checkPermission('client.create'), createClient);
router.get('/',           checkPermission('client.view'),   getClients);
router.get('/:id',        checkPermission('client.view'),   getClientById);
router.put('/:id',        checkPermission('client.edit'),   updateClient);
router.delete('/:id',     checkPermission('client.edit'),   deactivateClient);

export default router;
