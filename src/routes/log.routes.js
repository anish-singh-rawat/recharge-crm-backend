import { Router } from 'express';
import { logController } from '../controllers/log.controller.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { authorizeRoles, authorizePermissions } from '../middlewares/authorize.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { ROLES } from '../constants/roles.js';

const router = Router();


router.use(authenticate);
router.use(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN));

router.get('/activity', authorizePermissions(PERMISSIONS.LOG_ACTIVITY), logController.getActivityLogs);
router.delete('/activity', authorizePermissions(PERMISSIONS.LOG_ACTIVITY), logController.deleteAllActivityLogs);

router.get('/audit', authorizePermissions(PERMISSIONS.LOG_AUDIT), logController.getAuditLogs);
router.delete('/audit', authorizePermissions(PERMISSIONS.LOG_AUDIT), logController.deleteAllAuditLogs);

router.get('/webhooks', authorizePermissions(PERMISSIONS.LOG_WEBHOOK), logController.getWebhookLogs);
router.delete('/webhooks', authorizePermissions(PERMISSIONS.LOG_WEBHOOK), logController.deleteAllWebhookLogs);

router.delete('/all', logController.deleteAllLogs);

export default router;
