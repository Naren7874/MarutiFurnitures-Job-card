import express from 'express';
import { verifyGST, getGSTType } from '../controllers/gst.js';
import { authenticateJWT }    from '../middleware/auth.js';
import { injectCompanyScope } from '../middleware/scope.js';
import { checkPermission }    from '../middleware/permission.js';

const router = express.Router();

router.use(authenticateJWT, injectCompanyScope);

router.post('/verify',        checkPermission('gst.verify'), verifyGST);
router.post('/determine-type', checkPermission('gst.verify'), getGSTType);

export default router;
