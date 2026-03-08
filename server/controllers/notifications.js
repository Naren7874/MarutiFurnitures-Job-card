import Notification from '../models/Notification.js';

/** GET /api/notifications — user's notifications, unread first */
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      recipientId: req.user.userId,
      companyId: req.user.companyId,
    })
      .sort({ isRead: 1, createdAt: -1 })
      .limit(60)
      .lean();
    res.json({ success: true, data: notifications });
  } catch (err) { next(err); }
};

/** PATCH /api/notifications/:id/read — mark one notification read */
export const markOneRead = async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user.userId },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};

/** PATCH /api/notifications/read-all — mark all of user's notifications read */
export const markAllRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user.userId, companyId: req.user.companyId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};
