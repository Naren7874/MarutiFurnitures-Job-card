import express from 'express';
const router = express.Router();
import * as controller from '../controllers/reports.js';

// Basic boilerplate routes
router.get('/', (req, res) => res.json({ message: 'reports.js route basic setup' }));

export default router;
