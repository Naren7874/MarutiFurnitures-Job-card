import 'dotenv/config'; 
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { initSocket } from './socket/socket.js';
import { startCronJobs } from './queues/cronJobs.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);


// ── Environment (handled by top-level import) ───────────────────────────────

// ── Database ─────────────────────────────────────────────────────────────────
await connectDB();

// ── Express ──────────────────────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Socket.io ────────────────────────────────────────────────────────────────
initSocket(server);

// ── Core Middleware ──────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "img-src": ["'self'", "data:", "blob:", "res.cloudinary.com", "*.cloudinary.com"],
      "connect-src": ["'self'", "res.cloudinary.com", "*.cloudinary.com", "wss:", "ws:"],
      "style-src": ["'self'", "'unsafe-inline'"],
      "script-src": ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
const ALLOWED_ORIGINS = process.env.NODE_ENV === 'production'
  ? [
      'http://jobcard.marutifurniture.com',                                           // Custom subdomain (HTTP)
      'https://jobcard.marutifurniture.com',                                          // Custom subdomain (HTTPS)
      'http://34.54.108.11',                                                          // GCP Load Balancer IP (fallback)
      'https://maruti-furniture-backend-43053062057.asia-south1.run.app',             // Cloud Run (self)
      process.env.FRONTEND_URL,                                                       // custom domain override via env
    ].filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, Postman)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
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
import notificationRoutes  from './routes/notifications.js';

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
app.use('/api/notifications',   notificationRoutes);

// ── Health Check ──────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.status(200).json({
    status:  'ok',
    service: 'Maruti Furniture API',
    time:    new Date().toISOString(),
  });
});

// ── Static files (React production build) ────────────────────────────────────
// Only active when the dist folder exists (i.e. after `npm run build`)
const distPath = path.join(__dirname, '../client/dist');
app.use(express.static(distPath));

// ── SPA Fallback — serve index.html for all non-API routes ───────────────────
// Must come AFTER API routes so /api/* is not caught here
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ── 404 Handler (API only) ────────────────────────────────────────────────────
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
});


// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[ERROR]', err.message, err.stack);

  // Always send CORS headers on error responses too.
  // Without this, PDF generation failures appear as CORS errors in the browser
  // because the error response doesn't include Access-Control-Allow-Origin.
  const origin = req.headers.origin;
  const allowedOrigins = ALLOWED_ORIGINS;
  if (origin && allowedOrigins.includes(origin)) {
    res.set('Access-Control-Allow-Origin', origin);
    res.set('Access-Control-Allow-Credentials', 'true');
  }

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
