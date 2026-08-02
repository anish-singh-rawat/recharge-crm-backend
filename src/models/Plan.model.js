import mongoose from 'mongoose';

const planSchema = new mongoose.Schema(
  {
    operator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'OperatorMaster',
      required: true,
    },
    circle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CircleMaster',
      required: true,
    },
    amount: {
      type: Number,
      required: [true, 'Plan amount is required'],
      min: 0,
    },
    talktime: {
      type: Number,
      default: 0,
    },
    validity: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    smsCount: {
      type: Number,
      default: 0,
    },
    dataAmount: {
      type: String, // e.g. "1.5GB/day", "24GB"
      default: '',
    },
    planType: {
      type: String,
      trim: true,
      default: 'TOPUP', // TOPUP, COMBO, DATA, SMS, etc.
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isPopular: {
      type: Boolean,
      default: false,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    expiresAt: {
      type: Date,
      default: null, // null = never expires
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

planSchema.index({ operator: 1, circle: 1, amount: 1 });
planSchema.index({ isActive: 1 });
planSchema.index({ operator: 1, isActive: 1 });

const Plan = mongoose.model('Plan', planSchema);
export default Plan;
