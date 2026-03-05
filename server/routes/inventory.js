import express from 'express';
import { createItem, getInventory, getItemById, updateItem, restockItem } from '../controllers/inventory.js';
import { authenticateJWT } from '../middleware/auth.js';
import { injectCompanyScope } from '../middleware/scope.js';
import { checkPermission } from '../middleware/permission.js';

const router = express.Router();
router.use(authenticateJWT, injectCompanyScope);

router.post('/',              checkPermission('inventory.create'), createItem);
router.get('/',               checkPermission('inventory.view'),   getInventory);
router.get('/:id',            checkPermission('inventory.view'),   getItemById);
router.put('/:id',            checkPermission('inventory.edit'),   updateItem);
router.patch('/:id/restock',  checkPermission('inventory.edit'),   restockItem);

export default router;
