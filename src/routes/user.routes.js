import { Router } from 'express';
import { userController } from '../controllers/user.controller.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { authorizeRoles, authorizePermissions } from '../middlewares/authorize.middleware.js';
import {
  createUserValidator,
  updateUserValidator,
  userListValidator,
  blockUserValidator,
} from '../validators/user.validator.js';
import { mongoIdParam } from '../validators/common.validator.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { ROLES } from '../constants/roles.js';

const router = Router();


router.use(authenticate);

router.get(
  '/',
  authorizePermissions(PERMISSIONS.USER_LIST),
  userListValidator,
  userController.listUsers,
);

router.post(
  '/',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  createUserValidator,
  userController.createUser,
);

router.get(
  '/:id',
  [mongoIdParam('id')],
  authorizePermissions(PERMISSIONS.USER_READ),
  userController.getUser,
);

router.put(
  '/:id',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  updateUserValidator,
  userController.updateUser,
);

router.delete(
  '/:id',
  [mongoIdParam('id')],
  authorizeRoles(ROLES.SUPER_ADMIN),
  userController.deleteUser,
);

router.patch(
  '/:id/block',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  blockUserValidator,
  userController.blockUser,
);

router.patch(
  '/:id/unblock',
  [mongoIdParam('id')],
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  userController.unblockUser,
);

router.patch(
  '/:id/api-access',
  [mongoIdParam('id')],
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  userController.toggleApiAccess,
);

router.patch(
  '/:id/commission',
  [mongoIdParam('id')],
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  userController.updateCommission,
);

export default router;
