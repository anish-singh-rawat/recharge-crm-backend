import { Router } from 'express';
import { rechargeController } from '../controllers/recharge.controller.js';
import { authenticateApiKey } from '../middlewares/authenticateApiKey.middleware.js';
import { authorizePermissions } from '../middlewares/authorize.middleware.js';
import { rechargeRateLimiter } from '../middlewares/rateLimiter.middleware.js';
import {
  initiateRechargeValidator,
  rechargeStatusValidator,
  rechargeListValidator,
} from '../validators/recharge.validator.js';
import { operatorController } from '../controllers/operator.controller.js';
import { walletController } from '../controllers/wallet.controller.js';
import { PERMISSIONS } from '../constants/permissions.js';

const router = Router();

router.use(authenticateApiKey);

router.post(
  '/recharge',
  rechargeRateLimiter,
  authorizePermissions(PERMISSIONS.RECHARGE_INITIATE),
  initiateRechargeValidator,
  rechargeController.initiateRecharge,
);

router.get(
  '/recharge',
  authorizePermissions(PERMISSIONS.RECHARGE_LIST),
  rechargeListValidator,
  rechargeController.getMyTransactions,
);

router.get(
  '/recharge/:txnId',
  authorizePermissions(PERMISSIONS.RECHARGE_STATUS),
  rechargeStatusValidator,
  rechargeController.getStatus,
);

router.get(
  '/wallet',
  authorizePermissions(PERMISSIONS.WALLET_READ),
  walletController.getMyWallet,
);

router.get(
  '/operators',
  authorizePermissions(PERMISSIONS.OPERATOR_LIST),
  operatorController.listActiveOperators,
);

router.get(
  '/circles',
  authorizePermissions(PERMISSIONS.CIRCLE_LIST),
  operatorController.listCircles,
);

router.get(
  '/plans',
  authorizePermissions(PERMISSIONS.PLAN_LIST),
  operatorController.getPlanRecommendations,
);

export default router;
