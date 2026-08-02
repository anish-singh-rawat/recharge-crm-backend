import { Router } from 'express';
import { notificationController } from '../controllers/notification.controller.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { authorizeRoles, authorizePermissions } from '../middlewares/authorize.middleware.js';
import {
  createNotificationValidator,
  broadcastNotificationValidator,
  notificationListValidator,
} from '../validators/notification.validator.js';
import { mongoIdParam } from '../validators/common.validator.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { ROLES } from '../constants/roles.js';

const router = Router();


router.use(authenticate);

router.get('/my', authorizePermissions(PERMISSIONS.NOTIFICATION_READ), notificationListValidator, notificationController.getMyNotifications);

router.patch('/my/read-all', authorizePermissions(PERMISSIONS.NOTIFICATION_READ), notificationController.markAllRead);

router.patch('/my/:id/read', [mongoIdParam('id')], authorizePermissions(PERMISSIONS.NOTIFICATION_READ), notificationController.markRead);

router.get('/', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), notificationListValidator, notificationController.listAllNotifications);

router.post('/', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.NOTIFICATION_CREATE), createNotificationValidator, notificationController.createNotification);

router.post('/broadcast', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.NOTIFICATION_BROADCAST), broadcastNotificationValidator, notificationController.broadcastNotification);

router.delete('/:id', [mongoIdParam('id')], authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.NOTIFICATION_DELETE), notificationController.deleteNotification);

export default router;
