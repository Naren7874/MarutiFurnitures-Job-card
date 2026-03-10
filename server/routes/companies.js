import express from 'express';
import {
    getCompanies,
    getCompanyById,
    updateCompany,
} from '../controllers/companies.js';
import { authenticateJWT } from '../middleware/auth.js';
import { checkPermission } from '../middleware/permission.js';

const router = express.Router();

router.use(authenticateJWT);

router.get('/', getCompanies);
router.get('/:id', getCompanyById);
router.put('/:id', checkPermission('settings.edit'), updateCompany);

export default router;
