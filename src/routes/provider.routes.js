import { Router } from 'express';
import { providerController } from '../controllers/provider.controller.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { authorizeRoles, authorizePermissions } from '../middlewares/authorize.middleware.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Provider
 *   description: MRobotics provider management
 */

router.use(authenticate);
router.use(authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN));

router.get('/', authorizePermissions(PERMISSIONS.PROVIDER_READ), providerController.getProviders);

router.get('/balance', authorizePermissions(PERMISSIONS.PROVIDER_BALANCE), providerController.getProviderBalance);

router.get('/operators', authorizePermissions(PERMISSIONS.PROVIDER_READ), providerController.getProviderOperators);

router.get('/circles', authorizePermissions(PERMISSIONS.PROVIDER_READ), providerController.getProviderCircles);

router.get('/plans', authorizePermissions(PERMISSIONS.PROVIDER_READ), providerController.getProviderPlans);

router.get('/detect-operator', authorizePermissions(PERMISSIONS.PROVIDER_READ), providerController.detectOperator);

export default router;
