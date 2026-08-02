import mongoose from 'mongoose';
import { TRANSACTION_STATUS, RECHARGE_TYPE } from '../constants/transaction.js';

const rechargeTransactionSchema = new mongoose.Schema(
  {
    // ── Internal IDs ──────────────────────────────────────────
    txnId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    correlationId: {
      type: String,
      trim: true,
      default: null,
    },

    // ── Relations ─────────────────────────────────────────────
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    wallet: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Wallet',
      required: true,
    },
    walletTxn: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WalletTransaction',
      default: null,
    },
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OperatorMaster',
      required: true,
    },
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CircleMaster',
      default: null,
    },
    provider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RechargeProvider',
      default: null,
    },

    // ── Recharge Details ──────────────────────────────────────
    mobileNumber: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [1, 'Amount must be at least 1'],
    },
    type: {
      type: String,
      enum: Object.values(RECHARGE_TYPE),
      required: true,
    },

    // ── Status ────────────────────────────────────────────────
    status: {
      type: String,
      enum: Object.values(TRANSACTION_STATUS),
      default: TRANSACTION_STATUS.INITIATED,
    },
    statusMessage: {
      type: String,
      default: '',
    },

    // ── Provider Response ─────────────────────────────────────
    providerTxnId: {
      type: String,
      trim: true,
      default: null,
    },
    providerStatus: {
      type: String,
      default: null,
    },
    providerMessage: {
      type: String,
      default: '',
    },
    providerResponseCode: {
      type: String,
      default: null,
    },
    operatorRef: {
      type: String,
      trim: true,
      default: null, // operator's own reference number
    },

    // ── Financial ─────────────────────────────────────────────
    commission: {
      type: Number,
      default: 0,
    },
    commissionRate: {
      type: Number,
      default: 0,
    },
    netAmount: {
      type: Number,
      default: 0, // amount - commission
    },
    refundAmount: {
      type: Number,
      default: 0,
    },

    // ── Retry ─────────────────────────────────────────────────
    retryCount: {
      type: Number,
      default: 0,
    },
    maxRetries: {
      type: Number,
      default: 3,
    },
    lastRetryAt: {
      type: Date,
      default: null,
    },
    nextRetryAt: {
      type: Date,
      default: null,
    },
    isRetryable: {
      type: Boolean,
      default: false,
    },
    isInDeadLetter: {
      type: Boolean,
      default: false,
    },

    // ── Settlement ────────────────────────────────────────────
    isSettled: {
      type: Boolean,
      default: false,
    },
    settledAt: {
      type: Date,
      default: null,
    },

    // ── Timestamps ────────────────────────────────────────────
    initiatedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    refundedAt: {
      type: Date,
      default: null,
    },

    // ── Request context ───────────────────────────────────────
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    requestId: {
      type: String,
      default: null,
    },

    // ── Raw responses (for debugging / dispute resolution) ────
    providerRequest: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      select: false,
    },
    providerResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      select: false,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

// ── Indexes ───────────────────────────────────────────────────────────────────
rechargeTransactionSchema.index({ txnId: 1 }, { unique: true });
rechargeTransactionSchema.index({ user: 1, createdAt: -1 });
rechargeTransactionSchema.index({ mobileNumber: 1, createdAt: -1 });
rechargeTransactionSchema.index({ status: 1, createdAt: -1 });
rechargeTransactionSchema.index({ providerTxnId: 1 });
rechargeTransactionSchema.index({ isRetryable: 1, status: 1, nextRetryAt: 1 });
rechargeTransactionSchema.index({ isSettled: 1, status: 1 });
rechargeTransactionSchema.index({ operator: 1, createdAt: -1 });
rechargeTransactionSchema.index({ createdAt: -1 });

const RechargeTransaction = mongoose.model('RechargeTransaction', rechargeTransactionSchema);
export default RechargeTransaction;
