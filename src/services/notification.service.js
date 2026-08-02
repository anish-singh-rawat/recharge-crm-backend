import { notificationRepository } from '../repositories/notification.repository.js';
import { userRepository } from '../repositories/user.repository.js';
import { buildListQuery } from '../helpers/query.helper.js';
import { NotFoundError } from '../helpers/error.helper.js';
import { NOTIFICATION_TYPE, NOTIFICATION_CHANNEL } from '../constants/notification.js';

export const notificationService = {
  async getMyNotifications(userId, query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['isRead', 'type'],
      dateField: 'createdAt',
    });
    filter.user = userId;

    const result = await notificationRepository.findByUser(userId, filter, {
      ...pagination,
      sort,
    });
    const unreadCount = await notificationRepository.countUnread(userId);

    return { ...result, unreadCount };
  },

  async markRead(notificationId, userId) {
    const notification = await notificationRepository.markAsRead(notificationId, userId);
    if (!notification) throw new NotFoundError('Notification not found');
    return notification;
  },

  async markAllRead(userId) {
    await notificationRepository.markAllAsRead(userId);
  },

  async create({ userId, title, message, type = NOTIFICATION_TYPE.INFO, channel = NOTIFICATION_CHANNEL.IN_APP, event = '', referenceId = null, metadata = {} }) {
    return notificationRepository.create({
      user: userId,
      title,
      message,
      type,
      channel,
      event,
      referenceId,
      metadata,
    });
  },

  async broadcast({ title, message, type = NOTIFICATION_TYPE.INFO, roles = [] }) {
    const filter = roles.length > 0 ? { role: { $in: roles }, isActive: true } : { isActive: true };
    const users = await userRepository.findMany(filter, { _id: 1 });

    if (!users.length) return { sent: 0 };

    const notifications = users.map((u) => ({
      user: u._id,
      title,
      message,
      type,
      isBroadcast: true,
    }));

    await notificationRepository.createBulk(notifications);
    return { sent: notifications.length };
  },

  async deleteById(notificationId) {
    const notification = await notificationRepository.deleteById(notificationId);
    if (!notification) throw new NotFoundError('Notification not found');
  },

  async listAll(query) {
    const { filter, pagination, sort } = buildListQuery(query, {
      exactFields: ['type', 'isRead', 'isBroadcast'],
      dateField: 'createdAt',
    });
    return notificationRepository.findPaginated(filter, {
      ...pagination,
      sort,
      populate: [{ path: 'user', select: 'name email' }],
    });
  },
};
