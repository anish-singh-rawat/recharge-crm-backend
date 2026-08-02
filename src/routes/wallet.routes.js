import { Router } from 'express';
import { walletController } from '../controllers/wallet.controller.js';
import { authenticate } from '../middlewares/authenticate.middleware.js';
import { authorizeRoles, authorizePermissions } from '../middlewares/authorize.middleware.js';
import {
  creditWalletValidator,
  debitWalletValidator,
  freezeWalletValidator,
  unfreezeWalletValidator,
  walletStatementValidator,
  myWalletStatementValidator,
  walletLedgerValidator,
} from '../validators/wallet.validator.js';
import { mongoIdParam } from '../validators/common.validator.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { ROLES } from '../constants/roles.js';

const router = Router();


router.use(authenticate);


router.get('/me', authorizePermissions(PERMISSIONS.WALLET_READ), walletController.getMyWallet);

router.get(
  '/me/statement',
  authorizePermissions(PERMISSIONS.WALLET_STATEMENT),
  myWalletStatementValidator,
  walletController.getMyStatement,
);


router.get(
  '/ledger',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.WALLET_LEDGER),
  walletLedgerValidator,
  walletController.getLedger,
);

router.get(
  '/:userId',
  [mongoIdParam('userId')],
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.WALLET_READ),
  walletController.getWalletByUserId,
);

router.get(
  '/:userId/statement',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  walletStatementValidator,
  walletController.getStatementByUserId,
);

router.post(
  '/:userId/credit',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.WALLET_CREDIT),
  creditWalletValidator,
  walletController.creditWallet,
);

router.post(
  '/:userId/debit',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.WALLET_DEBIT),
  debitWalletValidator,
  walletController.debitWallet,
);

router.patch(
  '/:userId/freeze',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.WALLET_FREEZE),
  freezeWalletValidator,
  walletController.freezeWallet,
);

router.patch(
  '/:userId/unfreeze',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.WALLET_UNFREEZE),
  unfreezeWalletValidator,
  walletController.unfreezeWallet,
);

export default router;
