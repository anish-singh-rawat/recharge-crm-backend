import mongoose from 'mongoose';
import { WALLET_STATUS } from '../constants/wallet.js';

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    balance: {
      type: Number,
      default: 0,
      min: [0, 'Balance cannot be negative'],
    },
    pendingAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    totalCredited: {
      type: Number,
      default: 0,
    },
    totalDebited: {
      type: Number,
      default: 0,
    },
    totalCommission: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: Object.values(WALLET_STATUS),
      default: WALLET_STATUS.ACTIVE,
    },
    walletLimit: {
      type: Number,
      default: 100000,
    },
    currency: {
      type: String,
      default: 'INR',
      uppercase: true,
    },
    frozenAt: {
      type: Date,
      default: null,
    },
    frozenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    frozenReason: {
      type: String,
      default: '',
    },
    lastTransactionAt: {
      type: Date,
      default: null,
    },
    // Optimistic concurrency version for atomic balance updates
    __v: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: '__v',
  },
);

walletSchema.index({ user: 1 }, { unique: true });
walletSchema.index({ status: 1 });

// ── Method: check if wallet can transact ──────────────────────────────────────
walletSchema.methods.canTransact = function () {
  return this.status === WALLET_STATUS.ACTIVE;
};

// ── Method: has sufficient balance ────────────────────────────────────────────
walletSchema.methods.hasSufficientBalance = function (amount) {
  return this.balance >= amount;
};

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
