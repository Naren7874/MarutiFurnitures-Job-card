import express from 'express';
import { getNotifications, markOneRead, markAllRead } from '../controllers/notifications.js';
import { authenticateJWT } from '../middleware/auth.js';
import { injectCompanyScope } from '../middleware/scope.js';

const router = express.Router();
router.use(authenticateJWT, injectCompanyScope);

router.get('/',              getNotifications);
router.patch('/read-all',    markAllRead);
router.patch('/:id/read',    markOneRead);

export default router;
