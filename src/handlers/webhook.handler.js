import { Router } from 'express';
import { mroboticsProvider } from '../services/providers/mrobotics/index.js';
import { realroboProvider } from '../services/providers/realrobo/index.js';
import { rechargeTransactionRepository } from '../repositories/recharge.repository.js';
import { walletRepository, walletTransactionRepository } from '../repositories/wallet.repository.js';
import { walletService } from '../services/wallet.service.js';
import { webhookLogRepository } from '../repositories/log.repository.js';
import { notificationRepository } from '../repositories/notification.repository.js';
import { TRANSACTION_STATUS } from '../constants/transaction.js';
import { WALLET_TRANSACTION_TYPE } from '../constants/wallet.js';
import { NOTIFICATION_EVENT, NOTIFICATION_TYPE } from '../constants/notification.js';
import { generateWalletTxnId } from '../utils/id.util.js';
import { webhookLogger } from '../config/logger.js';
import env from '../config/env.js';

const router = Router();

const processWebhookPayload = async (webhookLog, normalised) => {
  const { internalTxnId, providerTxnId, internalStatus, message, operatorRef } = normalised;

  const txn = internalTxnId
    ? await rechargeTransactionRepository.findByTxnId(internalTxnId)
    : await rechargeTransactionRepository.findByProviderTxnId(providerTxnId);

  if (!txn) {
    await webhookLogRepository.markProcessed(webhookLog._id, 'Transaction not found');
    webhookLogger.warn('Webhook: transaction not found', { internalTxnId, providerTxnId });
    return;
  }

  // Already terminal and not needing recovery
  if (
    [TRANSACTION_STATUS.SUCCESS, TRANSACTION_STATUS.REFUNDED, TRANSACTION_STATUS.REVERSED].includes(txn.status)
  ) {
    await webhookLogRepository.markProcessed(webhookLog._id);
    webhookLogger.info('Webhook: transaction already in terminal state', { txnId: txn.txnId, status: txn.status });
    return;
  }

  // If incoming webhook confirms SUCCESS, but the txn was previously marked FAILED and refunded (e.g. from timeout)
  if (
    internalStatus === TRANSACTION_STATUS.SUCCESS &&
    txn.status === TRANSACTION_STATUS.FAILED &&
    txn.refundAmount > 0
  ) {
    try {
      const walletId = txn.wallet?._id || txn.wallet;
      const currentWallet = await walletRepository.model.findById(walletId);
      const balanceBefore = currentWallet?.balance ?? 0;
      const balanceAfter = parseFloat((balanceBefore - txn.refundAmount).toFixed(2));

      await walletRepository.model.findByIdAndUpdate(walletId, {
        $inc: { balance: -txn.refundAmount, totalDebited: txn.refundAmount },
        $set: { lastTransactionAt: new Date() },
      });

      await walletTransactionRepository.create({
        wallet: walletId,
        user: txn.user,
        txnId: generateWalletTxnId(),
        type: WALLET_TRANSACTION_TYPE.DEBIT,
        amount: txn.refundAmount,
        balanceBefore,
        balanceAfter,
        description: `Recharge confirmed SUCCESS via webhook - reversal of previous timeout refund`,
        referenceId: txn.txnId,
        referenceType: 'RECHARGE',
      });

      await rechargeTransactionRepository.updateOne(
        { txnId: txn.txnId },
        { $set: { refundAmount: 0 } }
      );

      webhookLogger.info('Re-debited previously refunded txn on webhook SUCCESS confirmation', {
        txnId: txn.txnId,
        amount: txn.refundAmount,
      });
    } catch (err) {
      webhookLogger.error('Failed to re-debit wallet on webhook SUCCESS', { txnId: txn.txnId, error: err.message });
    }
  }

  await rechargeTransactionRepository.updateStatus(txn.txnId, internalStatus, {
    providerTxnId: providerTxnId || txn.providerTxnId,
    providerStatus: normalised.providerStatus,
    providerMessage: message,
    operatorRef: operatorRef || txn.operatorRef,
  });

  // If incoming webhook says FAILED, only refund if not already refunded
  if (
    internalStatus === TRANSACTION_STATUS.FAILED &&
    txn.status !== TRANSACTION_STATUS.FAILED &&
    !(txn.refundAmount > 0)
  ) {
    const wallet = await walletRepository.findByUserId(txn.user.toString());
    if (wallet) {
      await walletService.refundFromRecharge(wallet._id, txn.amount, txn.txnId, txn.user);
      await rechargeTransactionRepository.updateStatus(txn.txnId, TRANSACTION_STATUS.FAILED, {
        refundAmount: txn.amount,
      });
    }
  }

  const isSuccess = internalStatus === TRANSACTION_STATUS.SUCCESS;
  notificationRepository.create({
    user: txn.user,
    title: isSuccess ? 'Recharge Successful' : 'Recharge Failed',
    message: isSuccess
      ? `Recharge of ₹${txn.amount} for ${txn.mobileNumber} confirmed. Ref: ${operatorRef || txn.txnId}`
      : `Recharge of ₹${txn.amount} for ${txn.mobileNumber} failed. Amount refunded.`,
    type: isSuccess ? NOTIFICATION_TYPE.SUCCESS : NOTIFICATION_TYPE.ERROR,
    event: isSuccess ? NOTIFICATION_EVENT.RECHARGE_SUCCESS : NOTIFICATION_EVENT.RECHARGE_FAILED,
    referenceId: txn.txnId,
  }).catch(() => {});

  await webhookLogRepository.markProcessed(webhookLog._id);
  webhookLogger.info('Webhook processed', { txnId: txn.txnId, newStatus: internalStatus });
};

// ── MRobotics Webhook ──────────────────────────────────────────────────────────
router.post('/mrobotics', async (req, res) => {
  const payload = req.body;
  const ipAddress = req.ip || '';

  const signatureHeader = req.headers['x-mrobotics-signature']
    || req.headers['x-signature']
    || '';

  const isVerified = mroboticsProvider.verifyWebhookSignature(payload, signatureHeader);

  if (!isVerified && env.app.isProd) {
    webhookLogger.warn('Webhook signature verification failed', { ipAddress });
    return res.status(401).json({ success: false, message: 'Invalid signature' });
  }

  const { isDuplicate } = await mroboticsProvider.checkWebhookDuplicate(payload);

  if (isDuplicate) {
    return res.status(200).json({ success: true, message: 'Duplicate webhook acknowledged' });
  }

  const webhookLog = await mroboticsProvider.logWebhook({
    provider: 'MROBOTICS',
    payload,
    headers: {
      'x-signature': signatureHeader,
      'content-type': req.headers['content-type'],
    },
    signature: signatureHeader,
    ipAddress,
    isVerified,
  });

  res.status(200).json({ success: true, message: 'Webhook received' });

  const normalised = mroboticsProvider.normaliseWebhook(payload);
  processWebhookPayload(webhookLog, normalised).catch((err) => {
    webhookLogger.error('Async webhook processing failed', { error: err.message });
    webhookLogRepository.markProcessed(webhookLog._id, err.message).catch(() => {});
  });
});

// ── RealRobo Webhook (GET and POST supported) ──────────────────────────────────
const handleRealRoboWebhook = async (req, res) => {
  // Merge query params (GET) and request body (POST)
  const payload = { ...req.query, ...req.body };
  const ipAddress = req.ip || '';

  webhookLogger.info('RealRobo webhook received', { ipAddress, payload });

  const { isDuplicate } = await realroboProvider.checkWebhookDuplicate(payload);
  if (isDuplicate) {
    return res.status(200).json({ success: true, message: 'Duplicate webhook acknowledged' });
  }

  const webhookLog = await realroboProvider.logWebhook({
    provider: 'REALROBO',
    payload,
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
    },
    ipAddress,
    isVerified: true,
  });

  // Acknowledge receipt to RealRobo immediately
  res.status(200).json({ success: true, message: 'Webhook received' });

  const normalised = realroboProvider.normaliseWebhook(payload);
  processWebhookPayload(webhookLog, normalised).catch((err) => {
    webhookLogger.error('RealRobo async webhook processing failed', { error: err.message });
    webhookLogRepository.markProcessed(webhookLog._id, err.message).catch(() => {});
  });
};

router.get('/realrobo', handleRealRoboWebhook);
router.post('/realrobo', handleRealRoboWebhook);

export default router;
