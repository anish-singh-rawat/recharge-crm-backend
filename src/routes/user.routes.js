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

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management (Admin/Super Admin)
 */

router.use(authenticate);

/**
 * @swagger
 * /users:
 *   get:
 *     summary: List all users (paginated)
 *     tags: [Users]
 *   post:
 *     summary: Create a new user / retailer
 *     tags: [Users]
 */
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

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *   put:
 *     summary: Update user
 *     tags: [Users]
 *   delete:
 *     summary: Soft-delete user
 *     tags: [Users]
 */
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

/**
 * @swagger
 * /users/{id}/block:
 *   patch:
 *     summary: Block a user
 *     tags: [Users]
 */
router.patch(
  '/:id/block',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  blockUserValidator,
  userController.blockUser,
);

/**
 * @swagger
 * /users/{id}/unblock:
 *   patch:
 *     summary: Unblock a user
 *     tags: [Users]
 */
router.patch(
  '/:id/unblock',
  [mongoIdParam('id')],
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  userController.unblockUser,
);

export default router;
