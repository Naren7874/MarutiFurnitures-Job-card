import express from 'express';
const router = express.Router();
import * as controller from '../controllers/companies.js';

// Basic boilerplate routes
router.get('/', (req, res) => res.json({ message: 'companies.js route basic setup' }));

export default router;
