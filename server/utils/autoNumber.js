import { Counter } from '../models/Counter.js';

/**
 * Atomically increment a counter and return the next sequence number.
 * @param {string} companyId  - MongoDB ObjectId stringified
 * @param {string} type       - 'quotation' | 'jobcard' | 'invoice' | 'project' | 'po'
 * @param {boolean} dailyReset - If true, resets sequence daily
 */
const getNextSeq = async (companyId, type, dailyReset = false) => {
  let key = `${companyId}_${type}`;
  if (dailyReset) {
    key += `_${ddmmyy()}`;
  }

  const doc = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
};

// ── Padding helpers ────────────────────────────────────────

const pad = (n, width = 3) => String(n).padStart(width, '0');

// DDMMYY from date
const ddmmyy = (date = new Date()) => {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = String(date.getFullYear()).slice(-2);
  return `${d}${m}${y}`;
};

// YY from date
const yy = (date = new Date()) => String(date.getFullYear()).slice(-2);

// YYYY from date
const yyyy = (date = new Date()) => String(date.getFullYear());

// ── Public generators ───────────────────────────────────────

/**
 * Quotation: MF – DDMMYY_01 – Client Name
 * Format: {prefix} – DDMMYY_{seq 2 digits} – {clientName}
 */
export const generateQuotationNumber = async (companyId, prefix = 'MF', clientName = '') => {
  const seq = await getNextSeq(companyId, 'quotation', true);
  const dateStr = ddmmyy();
  const sequenceStr = String(seq).padStart(2, '0');
  
  if (!clientName) return `${prefix} – ${dateStr}_${sequenceStr}`;
  return `${prefix} – ${dateStr}_${sequenceStr} – ${clientName}`;
};

/**
 * Job Card: MF-26-011
 * Format: {prefix}-YY-{seq 3 digits}
 */
export const generateJobCardNumber = async (companyId, prefix = 'MF') => {
  const seq = await getNextSeq(companyId, 'jobcard');
  return `${prefix}-${yy()}-${pad(seq)}`;
};

/**
 * Invoice: MF-INV-2026-001
 * Format: {prefix}-INV-YYYY-{seq 3 digits}
 */
export const generateInvoiceNumber = async (companyId, prefix = 'MF') => {
  const seq = await getNextSeq(companyId, 'invoice');
  return `${prefix}-INV-${yyyy()}-${pad(seq)}`;
};

/**
 * Project: MF-PRJ-2026-001
 * Format: {prefix}-PRJ-YYYY-{seq 3 digits}
 */
export const generateProjectNumber = async (companyId, prefix = 'MF') => {
  const seq = await getNextSeq(companyId, 'project');
  return `${prefix}-PRJ-${yyyy()}-${pad(seq)}`;
};

/**
 * Purchase Order: MF-PO-2026-001
 * Format: {prefix}-PO-YYYY-{seq 3 digits}
 */
export const generatePONumber = async (companyId, prefix = 'MF') => {
  const seq = await getNextSeq(companyId, 'po');
  return `${prefix}-PO-${yyyy()}-${pad(seq)}`;
};
