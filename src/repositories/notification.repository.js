import { Notification } from '../models/index.js';
import { BaseRepository } from './base.repository.js';

class NotificationRepository extends BaseRepository {
  constructor() {
    super(Notification);
  }

  async findByUser(userId, filter = {}, paginationOptions = {}) {
    return this.findPaginated(
      { user: userId, ...filter },
      { ...paginationOptions, sort: { createdAt: -1 } },
    );
  }

  async countUnread(userId) {
    return Notification.countDocuments({ user: userId, isRead: false });
  }

  async markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { $set: { isRead: true, readAt: new Date() } },
      { new: true },
    ).lean();
  }

  async markAllAsRead(userId) {
    return Notification.updateMany(
      { user: userId, isRead: false },
      { $set: { isRead: true, readAt: new Date() } },
    );
  }

  async deleteManyByUser(userId) {
    return Notification.deleteMany({ user: userId });
  }

  async createBulk(notifications) {
    return Notification.insertMany(notifications, { ordered: false });
  }
}

export const notificationRepository = new NotificationRepository();
