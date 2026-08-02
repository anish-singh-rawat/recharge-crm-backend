import { Router } from 'express';
import { rechargeController } from '../controllers/recharge.controller.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { authorizeRoles, authorizePermissions } from '../middlewares/authorize.middleware.js';
import { rechargeRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import {
  initiateRechargeValidator,
  rechargeStatusValidator,
  rechargeListValidator,
  retryRechargeValidator,
  refundRechargeValidator,
} from '../validators/recharge.validator.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Recharge
 *   description: Mobile/DTH/Utility recharge
 */

router.use(authenticate);

// ── Retailer routes ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /recharge:
 *   post:
 *     summary: Initiate a recharge
 *     tags: [Recharge]
 */
router.post(
  '/',
  rechargeRateLimiter,
  authorizePermissions(PERMISSIONS.RECHARGE_INITIATE),
  initiateRechargeValidator,
  rechargeController.initiateRecharge,
);

/**
 * @swagger
 * /recharge/my:
 *   get:
 *     summary: Get my recharge transactions
 *     tags: [Recharge]
 */
router.get(
  '/my',
  authorizePermissions(PERMISSIONS.RECHARGE_LIST),
  rechargeListValidator,
  rechargeController.getMyTransactions,
);

/**
 * @swagger
 * /recharge/status/{txnId}:
 *   get:
 *     summary: Get recharge status (retailer — own txn only)
 *     tags: [Recharge]
 */
router.get(
  '/status/:txnId',
  authorizePermissions(PERMISSIONS.RECHARGE_STATUS),
  rechargeStatusValidator,
  rechargeController.getStatus,
);

// ── Admin routes ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * /recharge/all:
 *   get:
 *     summary: List all recharge transactions (Admin)
 *     tags: [Recharge]
 */
router.get(
  '/all',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.RECHARGE_LIST),
  rechargeListValidator,
  rechargeController.listAllTransactions,
);

/**
 * @swagger
 * /recharge/admin/status/{txnId}:
 *   get:
 *     summary: Get any transaction status (Admin)
 *     tags: [Recharge]
 */
router.get(
  '/admin/status/:txnId',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  rechargeStatusValidator,
  rechargeController.getStatusAdmin,
);

/**
 * @swagger
 * /recharge/{txnId}/retry:
 *   post:
 *     summary: Retry a failed recharge (Admin)
 *     tags: [Recharge]
 */
router.post(
  '/:txnId/retry',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.RECHARGE_RETRY),
  retryRechargeValidator,
  rechargeController.retryRecharge,
);

/**
 * @swagger
 * /recharge/{txnId}/refund:
 *   post:
 *     summary: Refund a recharge (Admin)
 *     tags: [Recharge]
 */
router.post(
  '/:txnId/refund',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.RECHARGE_REFUND),
  refundRechargeValidator,
  rechargeController.refundRecharge,
);

export default router;
