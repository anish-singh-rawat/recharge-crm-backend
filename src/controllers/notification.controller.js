import { notificationService } from '../services/notification.service.js';
import { sendSuccess, paginatedResponse } from '../utils/response.util.js';
import { asyncHandler } from '../utils/async.util.js';
import { HTTP_STATUS } from '../constants/http.js';

export const notificationController = {
  getMyNotifications: asyncHandler(async (req, res) => {
    const result = await notificationService.getMyNotifications(req.user.id, req.query);
    sendSuccess(res, {
      message: 'Notifications retrieved',
      data: {
        ...paginatedResponse(result.items, {
          page: parseInt(req.query.page, 10) || 1,
          limit: parseInt(req.query.limit, 10) || 20,
          total: result.total,
        }),
        unreadCount: result.unreadCount,
      },
    });
  }),

  markRead: asyncHandler(async (req, res) => {
    const notification = await notificationService.markRead(req.params.id, req.user.id);
    sendSuccess(res, { message: 'Notification marked as read', data: { notification } });
  }),

  markAllRead: asyncHandler(async (req, res) => {
    await notificationService.markAllRead(req.user.id);
    sendSuccess(res, { message: 'All notifications marked as read' });
  }),

  createNotification: asyncHandler(async (req, res) => {
    const notification = await notificationService.create({
      userId: req.body.userId,
      title: req.body.title,
      message: req.body.message,
      type: req.body.type,
      channel: req.body.channel,
      event: req.body.event,
    });
    sendSuccess(res, {
      message: 'Notification sent',
      data: { notification },
      statusCode: HTTP_STATUS.CREATED,
    });
  }),

  broadcastNotification: asyncHandler(async (req, res) => {
    const result = await notificationService.broadcast(req.body);
    sendSuccess(res, {
      message: `Notification broadcast to ${result.sent} users`,
      data: result,
    });
  }),

  deleteNotification: asyncHandler(async (req, res) => {
    await notificationService.deleteById(req.params.id);
    sendSuccess(res, { message: 'Notification deleted' });
  }),

  listAllNotifications: asyncHandler(async (req, res) => {
    const { items, total } = await notificationService.listAll(req.query);
    sendSuccess(res, {
      message: 'Notifications retrieved',
      data: paginatedResponse(items, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        total,
      }),
    });
  }),
};
