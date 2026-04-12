import express from 'express';
import { getDeliveries, scheduleDelivery, completeDelivery } from '../controllers/deliveries.js';
import { authenticateJWT as requireAuth } from '../middleware/auth.js';
import { uploadMultiple } from '../middleware/upload.js';

const router = express.Router();

router.use(requireAuth);

router.get('/', getDeliveries);
router.post('/', scheduleDelivery);
router.patch('/:id/complete', uploadMultiple, completeDelivery);

export default router;
