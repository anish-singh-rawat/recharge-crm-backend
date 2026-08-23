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
  },
  {
    timestamps: true,
    versionKey: '__v',
  },
);

walletSchema.index({ status: 1 });

walletSchema.methods.canTransact = function () {
  return this.status === WALLET_STATUS.ACTIVE;
};

walletSchema.methods.hasSufficientBalance = function (amount) {
  return this.balance >= amount;
};

const Wallet = mongoose.model('Wallet', walletSchema);
export default Wallet;
