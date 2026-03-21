import { Counter } from '../models/Counter.js';

/**
 * Atomically increment a counter and return the next sequence number.
 * @param {string} companyId  - MongoDB ObjectId stringified
 * @param {string} type       - 'quotation' | 'jobcard' | 'invoice' | 'project' | 'po'
 * @param {boolean} dailyReset - If true, resets sequence daily
 */
const getNextSeq = async (companyId, type, initialValue = 1, yearlyReset = false) => {
  let key = `${companyId}_${type}`;
  if (yearlyReset) {
    key += `_${new Date().getFullYear()}`;
  }

  // Atomically initialize to (initialValue - 1) if new, then increment by 1.
  // This ensures the first sequence number is exactly initialValue.
  const result = await Counter.collection.findOneAndUpdate(
    { _id: key },
    [
      {
        $set: {
          seq: {
            $switch: {
              branches: [
                { case: { $gt: ['$seq', 0] }, then: { $add: ['$seq', 1] } }
              ],
              default: initialValue
            }
          }
        }
      }
    ],
    { returnDocument: 'after', upsert: true }
  );
  // MongoDB driver 6.0+ returns the doc directly, older versions return { value: doc }
  const doc = result.value || result;
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

// ── Public generators ───────────────────────────────────────

/**
 * Quotation: MF - 170326-100 - Swapnil makwan
 * Format: {prefix} - DDMMYY-seq - {clientName}
 */
export const generateQuotationNumber = async (companyId, prefix = 'MF', clientName = '') => {
  const seq = await getNextSeq(companyId, 'quotation', 100, true);
  const dateStr = ddmmyy();
  
  const base = `${prefix} - ${dateStr}-${seq}`;
  if (!clientName) return base;
  return `${base} - ${clientName}`;
};

/**
 * Job Card: MF - 170326-1000
 * Format: {prefix} - DDMMYY-seq
 */
export const generateJobCardNumber = async (companyId, prefix = 'MF') => {
  const seq = await getNextSeq(companyId, 'jobcard', 1000, true);
  const dateStr = ddmmyy();
  return `${prefix} - ${dateStr}-${seq}`;
};

/**
 * Invoice: MF - INV - 170326-100
 * Format: {prefix} - INV - DDMMYY-seq
 */
export const generateInvoiceNumber = async (companyId, prefix = 'MF') => {
  const seq = await getNextSeq(companyId, 'invoice', 100, true);
  const dateStr = ddmmyy();
  return `${prefix} - INV - ${dateStr}-${seq}`;
};

/**
 * Project: MF - PRJ - 170326-100
 * Format: {prefix} - PRJ - DDMMYY-seq
 */
export const generateProjectNumber = async (companyId, prefix = 'MF') => {
  const seq = await getNextSeq(companyId, 'project', 100, true);
  const dateStr = ddmmyy();
  return `${prefix} - PRJ - ${dateStr}-${seq}`;
};

/**
 * Purchase Order: MF - PO - 170326-100
 * Format: {prefix} - PO - DDMMYY-seq
 */
export const generatePONumber = async (companyId, prefix = 'MF') => {
  const seq = await getNextSeq(companyId, 'po', 100, true);
  const dateStr = ddmmyy();
  return `${prefix} - PO - ${dateStr}-${seq}`;
};
