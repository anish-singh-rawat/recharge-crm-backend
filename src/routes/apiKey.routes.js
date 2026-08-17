import { Router } from 'express';
import { apiKeyController } from '../controllers/apiKey.controller.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { authorizePermissions } from '../middlewares/authorize.middleware.js';
import { requireApiAccess } from '../middlewares/requireApiAccess.middleware.js';
import { createApiKeyValidator, revokeApiKeyValidator } from '../validators/apikey.validator.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticate);
router.use(requireApiAccess);

router.get('/', authorizePermissions(PERMISSIONS.API_KEY_LIST), apiKeyController.listApiKeys);
router.post('/', authorizePermissions(PERMISSIONS.API_KEY_CREATE), createApiKeyValidator, apiKeyController.createApiKey);
router.get('/:id', authorizePermissions(PERMISSIONS.API_KEY_READ), apiKeyController.getApiKey);
router.patch('/:id/revoke', authorizePermissions(PERMISSIONS.API_KEY_REVOKE), revokeApiKeyValidator, apiKeyController.revokeApiKey);

export default router;
