import mongoose from 'mongoose';
import { PROVIDER_STATUS, PROVIDER_CODES } from '../constants/provider.js';

const rechargeProviderSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Provider name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Provider code is required'],
      trim: true,
      uppercase: true,
      unique: true,
      enum: Object.values(PROVIDER_CODES),
    },
    baseUrl: {
      type: String,
      required: true,
      trim: true,
    },
    apiKey: {
      type: String,
      trim: true,
      default: '',
      select: false,
    },
    apiSecret: {
      type: String,
      trim: true,
      default: '',
      select: false,
    },
    memberId: {
      type: String,
      trim: true,
      default: '',
    },
    status: {
      type: String,
      enum: Object.values(PROVIDER_STATUS),
      default: PROVIDER_STATUS.ACTIVE,
    },
    priority: {
      type: Number,
      default: 1, // Lower number = higher priority for failover
    },
    timeoutMs: {
      type: Number,
      default: 30000,
    },
    retryCount: {
      type: Number,
      default: 3,
    },
    retryDelayMs: {
      type: Number,
      default: 1000,
    },
    balance: {
      type: Number,
      default: 0,
    },
    balanceLastCheckedAt: {
      type: Date,
      default: null,
    },
    supportedTypes: {
      type: [String],
      default: [],
    },
    webhookSecret: {
      type: String,
      default: '',
      select: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

rechargeProviderSchema.index({ code: 1 }, { unique: true });
rechargeProviderSchema.index({ status: 1, priority: 1 });

const RechargeProvider = mongoose.model('RechargeProvider', rechargeProviderSchema);
export default RechargeProvider;
