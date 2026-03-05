import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import { initSocket } from './socket/socket.js';
import { startCronJobs } from './queues/cronJobs.js';

// ── Environment ──────────────────────────────────────────────────────────────
dotenv.config();

// ── Database ─────────────────────────────────────────────────────────────────
connectDB();

// ── Express ──────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────────────────────
initSocket(server);

// ── Core Middleware ──────────────────────────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(cors({
  origin:      process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ── Route imports ────────────────────────────────────────────────────────────
import authRoutes          from './routes/auth.js';
import companyRoutes       from './routes/companies.js';
import userRoutes          from './routes/users.js';
import clientRoutes        from './routes/clients.js';
import projectRoutes       from './routes/projects.js';
import quotationRoutes     from './routes/quotations.js';
import jobcardRoutes       from './routes/jobcards.js';
import invoiceRoutes       from './routes/invoices.js';
import inventoryRoutes     from './routes/inventory.js';
import purchaseOrderRoutes from './routes/purchaseOrders.js';
import gstRoutes           from './routes/gst.js';
import reportRoutes        from './routes/reports.js';
import privilegeRoutes     from './routes/privileges.js';

// ── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',            authRoutes);
app.use('/api/companies',       companyRoutes);
app.use('/api/users',           userRoutes);
app.use('/api/clients',         clientRoutes);
app.use('/api/projects',        projectRoutes);
app.use('/api/quotations',      quotationRoutes);
app.use('/api/jobcards',        jobcardRoutes);   // includes nested /:id/design|store|production|qc|dispatch
app.use('/api/invoices',        invoiceRoutes);
app.use('/api/inventory',       inventoryRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/gst',             gstRoutes);
app.use('/api/reports',         reportRoutes);
app.use('/api/privileges',      privilegeRoutes);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status:  'ok',
    service: 'Maruti Furniture API',
    time:    new Date().toISOString(),
  });
});

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message, err.stack);

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors: messages });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    return res.status(400).json({ success: false, message: `Duplicate value for field: ${field}` });
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid ${err.path}: ${err.value}` });
  }

  const status = err.statusCode || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
});

// ── Start Server ──────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`\n🚀 Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  console.log(`📡 API: http://localhost:${PORT}/health`);

  // Start cron jobs after server is up
  startCronJobs();
});

export default app;
