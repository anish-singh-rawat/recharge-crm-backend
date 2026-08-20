import mongoose from 'mongoose';
import { RECHARGE_TYPE } from '../constants/transaction.js';

const operatorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Operator name is required'],
      trim: true,
      unique: true,
    },
    code: {
      type: String,
      required: [true, 'Operator code is required'],
      trim: true,
      uppercase: true,
      unique: true,
    },
    providerCode: {
      type: String,
      trim: true,
      default: '',
    },
    realroboProviderCode: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: Object.values(RECHARGE_TYPE),
      required: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: '',
    },
    logo: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    minAmount: {
      type: Number,
      default: 10,
      min: 0,
    },
    maxAmount: {
      type: Number,
      default: 10000,
      min: 0,
    },
    commission: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    supportedCircles: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'CircleMaster',
      default: [],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

operatorSchema.index({ type: 1, isActive: 1 });
operatorSchema.index({ isActive: 1, sortOrder: 1 });

const OperatorMaster = mongoose.model('OperatorMaster', operatorSchema);
export default OperatorMaster;
