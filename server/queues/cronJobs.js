/**
 * Deadline + Stock Cron Jobs
 * Uses setInterval (swap with node-cron or Bull repeatable jobs in production)
 *
 * Jobs:
 *  1. Daily 08:00 — Deadline checker (3-day warning + overdue)
 *  2. Daily 08:30 — Inventory low-stock alert
 *  3. Daily 09:00 — Payment overdue checker
 */

import JobCard from '../models/JobCard.js';
import { Inventory } from '../models/Inventory.js';
import { Invoice } from '../models/Invoice.js';
import { enqueueNotification } from './notificationQueue.js';
import { runExpiredOverridesCron } from './expiredOverrides.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ── 1. Deadline Checker ──────────────────────────────────────────────────────

export const runDeadlineChecker = async () => {
  console.log('[CRON] Running deadline checker...');
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * MS_PER_DAY);

  // Approaching deadline (within 3 days, not yet overdue)
  const approaching = await JobCard.find({
    status:          { $nin: ['closed', 'cancelled', 'delivered', 'on_hold'] },
    expectedDelivery: { $lte: threeDaysLater, $gte: now },
  }).populate('createdBy', 'whatsappNumber').lean();

  for (const jc of approaching) {
    await enqueueNotification({
      companyId:   jc.companyId,
      recipientId: jc.createdBy?._id,
      jobCardId:   jc._id,
      type:        'overdue_alert',
      title:       `Deadline Alert: ${jc.jobCardNumber}`,
      message:     `${jc.jobCardNumber} — ${jc.title} is due within 3 days. Status: ${jc.status.toUpperCase()}`,
      channel:     'in_app',
      deliveryStatus: 'pending',
    });
  }

  // Overdue (past expected delivery)
  const overdue = await JobCard.find({
    status:          { $nin: ['closed', 'cancelled', 'delivered', 'on_hold'] },
    expectedDelivery: { $lt: now },
  }).populate('createdBy', 'whatsappNumber').lean();

  for (const jc of overdue) {
    const daysLate = Math.floor((now - new Date(jc.expectedDelivery)) / MS_PER_DAY);
    await enqueueNotification({
      companyId:   jc.companyId,
      recipientId: jc.createdBy?._id,
      jobCardId:   jc._id,
      type:        'overdue_alert',
      title:       `OVERDUE: ${jc.jobCardNumber}`,
      message:     `${jc.jobCardNumber} is ${daysLate} day(s) overdue. Current status: ${jc.status.toUpperCase()}`,
      channel:     'in_app',
      deliveryStatus: 'pending',
    });
  }

  console.log(`[CRON] Deadline checker: ${approaching.length} approaching, ${overdue.length} overdue`);
};

// ── 2. Low Stock Checker ─────────────────────────────────────────────────────

export const runLowStockChecker = async () => {
  console.log('[CRON] Running low-stock checker...');

  // Finding items where currentStock <= minStock and alert not yet sent
  const lowItems = await Inventory.find({
    lowStockAlert: false,
    $expr: { $lte: ['$currentStock', '$minStock'] }
  }).lean();

  const alerts = lowItems;

  for (const item of alerts) {
    await Inventory.findByIdAndUpdate(item._id, { lowStockAlert: true, lastAlertSentAt: new Date() });
    await enqueueNotification({
      companyId:   item.companyId,
      recipientId: item.updatedBy,   // Store manager
      type:        'low_stock_alert',
      title:       `Low Stock: ${item.itemName}`,
      message:     `${item.itemName} stock is at ${item.currentStock} ${item.unit}. Minimum required: ${item.minStock}.`,
      channel:     'in_app',
      deliveryStatus: 'pending',
    });
  }

  console.log(`[CRON] Low-stock check: ${alerts.length} items flagged`);
};

// ── 3. Payment Overdue Checker ───────────────────────────────────────────────

export const runPaymentOverdueChecker = async () => {
  console.log('[CRON] Running payment overdue checker...');
  const now = new Date();

  const overdueInvoices = await Invoice.find({
    status:   { $in: ['sent', 'partially_paid'] },
    dueDate:  { $lt: now },
  }).populate('clientId', 'whatsappNumber name').lean();

  for (const invoice of overdueInvoices) {
    await Invoice.findByIdAndUpdate(invoice._id, { status: 'overdue' });
    await enqueueNotification({
      companyId:   invoice.companyId,
      recipientId: invoice.createdBy,
      type:        'payment_overdue',
      title:       `Payment Overdue: ${invoice.invoiceNumber}`,
      message:     `Invoice ${invoice.invoiceNumber} for ${invoice.clientId?.name} of ₹${invoice.balanceDue?.toLocaleString()} is overdue.`,
      channel:     'in_app',
      deliveryStatus: 'pending',
    });
  }

  console.log(`[CRON] Payment overdue check: ${overdueInvoices.length} invoices overdue`);
};

// ── Scheduler — Runs daily ────────────────────────────────────────────────────
// In production: use node-cron or Bull repeatable jobs with Redis

export const startCronJobs = () => {
  const RUN_EVERY = 24 * 60 * 60 * 1000; // 24 hours

  // Stagger start times
  setTimeout(() => {
    runDeadlineChecker();
    setInterval(runDeadlineChecker, RUN_EVERY);
  }, 0);

  setTimeout(() => {
    runLowStockChecker();
    setInterval(runLowStockChecker, RUN_EVERY);
  }, 30 * 60 * 1000); // 30 min after deadline check

  setTimeout(() => {
    runPaymentOverdueChecker();
    setInterval(runPaymentOverdueChecker, RUN_EVERY);
  }, 60 * 60 * 1000); // 60 min after deadline check

  // SRS §10 — expired permission overrides (runs daily at midnight)
  setTimeout(() => {
    runExpiredOverridesCron();
    setInterval(runExpiredOverridesCron, RUN_EVERY);
  }, 90 * 60 * 1000); // 90 min after deadline check (staggered)

  console.log('✅ Cron jobs scheduled');
};
