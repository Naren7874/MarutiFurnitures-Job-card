import express from 'express';
const router = express.Router();
import * as controller from '../controllers/whatsapp.js';

// Basic boilerplate routes
router.get('/', (req, res) => res.json({ message: 'whatsapp.js route basic setup' }));

export default router;
