import mongoose from 'mongoose';

const webhookLogSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    eventType: {
      type: String,
      trim: true,
      default: '',
    },
    providerTxnId: {
      type: String,
      trim: true,
      default: null,
    },
    internalTxnId: {
      type: String,
      trim: true,
      default: null,
    },
    payload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    headers: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      select: false,
    },
    signature: {
      type: String,
      default: null,
      select: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isProcessed: {
      type: Boolean,
      default: false,
    },
    isDuplicate: {
      type: Boolean,
      default: false,
    },
    processingError: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    idempotencyKey: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

webhookLogSchema.index({ provider: 1, createdAt: -1 });
webhookLogSchema.index({ providerTxnId: 1 });
webhookLogSchema.index({ internalTxnId: 1 });
webhookLogSchema.index({ isProcessed: 1, createdAt: -1 });
webhookLogSchema.index({ idempotencyKey: 1 }, { sparse: true });
// TTL: auto-delete after 90 days
webhookLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 90 * 24 * 60 * 60 },
);

const WebhookLog = mongoose.model('WebhookLog', webhookLogSchema);
export default WebhookLog;
