import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { emitNotification } from '../socket/socket.js';

/**
 * Send internal system notifications to multiple recipients and emit via socket.
 * 
 * @param {Object} params
 * @param {ObjectId} params.companyId
 * @param {ObjectId[]} params.recipients - Array of user IDs
 * @param {string} params.type - Notification enum type
 * @param {string} params.title
 * @param {string} params.message
 * @param {ObjectId} [params.jobCardId]
 * @param {ObjectId} [params.projectId]
 * @param {ObjectId} [params.quotationId]
 */
export const notifyRecipients = async ({
  companyId,
  recipients,
  type,
  title,
  message,
  jobCardId,
  projectId,
  quotationId,
}) => {
  if (!recipients || recipients.length === 0) return;

  const docs = recipients.map(recipientId => ({
    companyId,
    recipientId,
    type,
    title,
    message,
    jobCardId,
    projectId,
    quotationId,
    channel: 'in_app',
  }));

  try {
    const saved = await Notification.insertMany(docs);
    
    // Emit via socket for real-time delivery
    saved.forEach(notif => {
      emitNotification(companyId, notif);
    });
  } catch (err) {
    console.error('Failed to create/emit internal notifications:', err.message);
  }
};

/**
 * Notify all active users in a specific department.
 */
export const notifyDepartment = async (companyId, department, params) => {
  try {
    const users = await User.find({ companyId, department, isActive: true }).select('_id').lean();
    const recipientIds = users.map(u => u._id);
    if (recipientIds.length > 0) {
      await notifyRecipients({ ...params, companyId, recipients: recipientIds });
    }
  } catch (err) {
    console.error(`Failed to notify department ${department}:`, err.message);
  }
};
