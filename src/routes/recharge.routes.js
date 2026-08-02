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


router.use(authenticate);


router.post(
  '/',
  rechargeRateLimiter,
  authorizePermissions(PERMISSIONS.RECHARGE_INITIATE),
  initiateRechargeValidator,
  rechargeController.initiateRecharge,
);

router.get(
  '/my',
  authorizePermissions(PERMISSIONS.RECHARGE_LIST),
  rechargeListValidator,
  rechargeController.getMyTransactions,
);

router.get(
  '/status/:txnId',
  authorizePermissions(PERMISSIONS.RECHARGE_STATUS),
  rechargeStatusValidator,
  rechargeController.getStatus,
);


router.get(
  '/all',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.RECHARGE_LIST),
  rechargeListValidator,
  rechargeController.listAllTransactions,
);

router.get(
  '/admin/status/:txnId',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  rechargeStatusValidator,
  rechargeController.getStatusAdmin,
);

router.post(
  '/:txnId/retry',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.RECHARGE_RETRY),
  retryRechargeValidator,
  rechargeController.retryRecharge,
);

router.post(
  '/:txnId/refund',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.RECHARGE_REFUND),
  refundRechargeValidator,
  rechargeController.refundRecharge,
);

export default router;
