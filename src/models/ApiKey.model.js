import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    name: {
      type: String,
      required: [true, 'API key name is required'],
      trim: true,
    },
    keyPrefix: {
      type: String,
      required: true,
      trim: true,
    },
    keyHash: {
      type: String,
      required: true,
      unique: true,
      select: false,
    },
    encryptedKey: {
      type: String,
      required: true,
      select: false,
    },
    permissions: {
      type: [String],
      default: [],
    },
    allowedIps: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    lastUsedIp: {
      type: String,
      default: null,
    },
    usageCount: {
      type: Number,
      default: 0,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    revokedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    revokedReason: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

apiKeySchema.index({ user: 1, isActive: 1 });
apiKeySchema.index({ keyPrefix: 1 });
apiKeySchema.index({ expiresAt: 1 }, { sparse: true });

const ApiKey = mongoose.model('ApiKey', apiKeySchema);
export default ApiKey;
