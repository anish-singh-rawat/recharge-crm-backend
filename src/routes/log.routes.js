import { Router } from 'express';
import { logController } from '../controllers/log.controller.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { authorizeRoles, authorizePermissions } from '../middlewares/authorize.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Logs
 *   description: Activity, audit and webhook logs
 */

router.use(authenticate);
router.use(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN));

router.get('/activity', authorizePermissions(PERMISSIONS.LOG_ACTIVITY), logController.getActivityLogs);

router.get('/audit', authorizePermissions(PERMISSIONS.LOG_AUDIT), logController.getAuditLogs);

router.get('/webhooks', authorizePermissions(PERMISSIONS.LOG_WEBHOOK), logController.getWebhookLogs);

export default router;
