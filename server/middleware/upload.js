import multer from 'multer';
import { uploadToCloudinary } from '../config/cloudinary.js';

// ── Multer config (memory storage — buffer sent to Cloudinary) ──────────────

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const ALLOWED_MIME = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    // CAD / design files
    'application/octet-stream',
    'image/vnd.dxf',
  ];
  if (ALLOWED_MIME.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
  }
};

const limits = { fileSize: 20 * 1024 * 1024 }; // 20 MB

// ── Multer instances ────────────────────────────────────────────────────────

/** Single image/file upload (field name: 'file') */
export const uploadSingle = multer({ storage, fileFilter, limits }).single('file');

/** Multiple files (field name: 'files', max: 10) */
export const uploadMultiple = multer({ storage, fileFilter, limits }).array('files', 10);

/** Fields for quotation items: 'photo' per item */
export const uploadFields = (fields) => multer({ storage, fileFilter, limits }).fields(fields);

// ── Cloudinary upload helpers ───────────────────────────────────────────────

/**
 * Upload req.file buffer to Cloudinary
 * @param {Express.Request} req
 * @param {string} folder - e.g. 'maruti/quotations'
 */
export const uploadReqFile = async (req, folder) => {
  if (!req.file) throw new Error('No file uploaded');
  return uploadToCloudinary(req.file.buffer, folder);
};

/**
 * Upload multiple req.files buffers to Cloudinary
 * @param {Express.Request} req
 * @param {string} folder
 */
export const uploadReqFiles = async (req, folder) => {
  if (!req.files?.length) return [];
  return Promise.all(req.files.map((f) => uploadToCloudinary(f.buffer, folder)));
};

// ── Error handler middleware for multer ──────────────────────────────────────

export const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ success: false, message: `Upload error: ${err.message}` });
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};
