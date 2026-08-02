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
  walletLedgerValidator,
} from '../validators/wallet.validator.js';
import { mongoIdParam } from '../validators/common.validator.js';
import { PERMISSIONS } from '../constants/permissions.js';
import { ROLES } from '../constants/roles.js';

const router = Router();

/**
 * @swagger
 * tags:
 *   name: Wallet
 *   description: Wallet management & transactions
 */

router.use(authenticate);

// ── Retailer routes ────────────────────────────────────────────────────────────

/**
 * @swagger
 * /wallet/me:
 *   get:
 *     summary: Get my wallet balance
 *     tags: [Wallet]
 */
router.get('/me', authorizePermissions(PERMISSIONS.WALLET_READ), walletController.getMyWallet);

/**
 * @swagger
 * /wallet/me/statement:
 *   get:
 *     summary: Get my wallet statement
 *     tags: [Wallet]
 */
router.get(
  '/me/statement',
  authorizePermissions(PERMISSIONS.WALLET_STATEMENT),
  walletStatementValidator,
  walletController.getMyStatement,
);

// ── Admin routes ───────────────────────────────────────────────────────────────

/**
 * @swagger
 * /wallet/ledger:
 *   get:
 *     summary: Full wallet ledger (Admin)
 *     tags: [Wallet]
 */
router.get(
  '/ledger',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.WALLET_LEDGER),
  walletLedgerValidator,
  walletController.getLedger,
);

/**
 * @swagger
 * /wallet/{userId}:
 *   get:
 *     summary: Get wallet by user ID (Admin)
 *     tags: [Wallet]
 */
router.get(
  '/:userId',
  [mongoIdParam('userId')],
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.WALLET_READ),
  walletController.getWalletByUserId,
);

/**
 * @swagger
 * /wallet/{userId}/statement:
 *   get:
 *     summary: Get wallet statement by user ID (Admin)
 *     tags: [Wallet]
 */
router.get(
  '/:userId/statement',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  walletStatementValidator,
  walletController.getStatementByUserId,
);

/**
 * @swagger
 * /wallet/{userId}/credit:
 *   post:
 *     summary: Credit wallet (Admin)
 *     tags: [Wallet]
 */
router.post(
  '/:userId/credit',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.WALLET_CREDIT),
  creditWalletValidator,
  walletController.creditWallet,
);

/**
 * @swagger
 * /wallet/{userId}/debit:
 *   post:
 *     summary: Debit wallet (Admin)
 *     tags: [Wallet]
 */
router.post(
  '/:userId/debit',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.WALLET_DEBIT),
  debitWalletValidator,
  walletController.debitWallet,
);

/**
 * @swagger
 * /wallet/{userId}/freeze:
 *   patch:
 *     summary: Freeze wallet (Admin)
 *     tags: [Wallet]
 */
router.patch(
  '/:userId/freeze',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.WALLET_FREEZE),
  freezeWalletValidator,
  walletController.freezeWallet,
);

/**
 * @swagger
 * /wallet/{userId}/unfreeze:
 *   patch:
 *     summary: Unfreeze wallet (Admin)
 *     tags: [Wallet]
 */
router.patch(
  '/:userId/unfreeze',
  authorizeRoles(ROLES.SUPER_ADMIN, ROLES.ADMIN),
  authorizePermissions(PERMISSIONS.WALLET_UNFREEZE),
  unfreezeWalletValidator,
  walletController.unfreezeWallet,
);

export default router;
