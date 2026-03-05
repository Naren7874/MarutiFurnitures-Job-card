import Bull from 'bull';
import Notification from '../models/Notification.js';
import { sendWhatsApp } from '../utils/sendWhatsApp.js';
import { sendEmail } from '../utils/sendEmail.js';

// ── Queue Setup ──────────────────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

export const notificationQueue = new Bull('notifications', REDIS_URL, {
  defaultJobOptions: {
    attempts:    3,
    backoff:     { type: 'exponential', delay: 5000 },
    removeOnComplete: 100,
    removeOnFail:     50,
  },
});

// ── Producer ─────────────────────────────────────────────────────────────────

/**
 * Enqueue a notification job.
 * Creates a Notification document and adds it to the queue.
 *
 * @param {object} payload - Notification fields
 */
export const enqueueNotification = async (payload) => {
  const notification = await Notification.create({
    ...payload,
    deliveryStatus: 'pending',
  });
  await notificationQueue.add({ notificationId: notification._id.toString() });
  return notification;
};

// ── Worker ───────────────────────────────────────────────────────────────────

notificationQueue.process(async (job) => {
  const { notificationId } = job.data;

  const notification = await Notification.findById(notificationId)
    .populate('recipientId', 'whatsappNumber email name')
    .lean();

  if (!notification) {
    throw new Error(`Notification ${notificationId} not found`);
  }

  const { channel, recipientId, waTemplateName, waVariables, title, message } = notification;

  try {
    if (channel === 'whatsapp' && recipientId?.whatsappNumber) {
      await sendWhatsApp(
        recipientId.whatsappNumber,
        waTemplateName,
        waVariables ? Object.values(waVariables) : [message]
      );
    }

    if (channel === 'email' && recipientId?.email) {
      await sendEmail({ to: recipientId.email, subject: title, html: `<p>${message}</p>` });
    }

    // in_app notifications are created in DB — frontend reads via Socket.io or polling
    // No action needed here for in_app

    await Notification.findByIdAndUpdate(notificationId, {
      deliveryStatus: 'delivered',
      sentAt:         new Date(),
    });
  } catch (err) {
    await Notification.findByIdAndUpdate(notificationId, {
      deliveryStatus: 'failed',
      $inc: { retryCount: 1 },
    });
    throw err; // Bull will retry
  }
});

// ── Queue events ─────────────────────────────────────────────────────────────

notificationQueue.on('failed', (job, err) => {
  console.error(`Notification job ${job.id} failed:`, err.message);
});

notificationQueue.on('completed', (job) => {
  console.log(`Notification job ${job.id} completed`);
});
