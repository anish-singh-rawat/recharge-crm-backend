import { Router } from 'express';
import { settingController } from '../controllers/setting.controller.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { authorizeRoles, authorizePermissions } from '../middlewares/authorize.middleware.js';
import { updateSettingValidator, bulkUpdateSettingsValidator } from '../validators/setting.validator.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: System settings
 */

router.get('/public', settingController.getPublicSettings);

router.use(authenticate);

router.get('/', authorizePermissions(PERMISSIONS.SETTINGS_READ), settingController.listSettings);

router.get('/:key', authorizePermissions(PERMISSIONS.SETTINGS_READ), settingController.getSetting);

router.put('/:key', authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN), authorizePermissions(PERMISSIONS.SETTINGS_UPDATE), updateSettingValidator, settingController.updateSetting);

router.post('/bulk', authorizeRoles(ROLES.SUPER_ADMIN), authorizePermissions(PERMISSIONS.SETTINGS_UPDATE), bulkUpdateSettingsValidator, settingController.bulkUpdateSettings);

export default router;
