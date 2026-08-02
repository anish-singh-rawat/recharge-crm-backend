import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    refreshToken: {
      type: String,
      required: true,
      select: false,
    },
    refreshTokenHash: {
      type: String,
      required: true,
    },
    deviceId: {
      type: String,
      default: '',
    },
    deviceName: {
      type: String,
      default: 'Unknown Device',
    },
    deviceType: {
      type: String,
      default: 'unknown',
    },
    platform: {
      type: String,
      default: '',
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    lastAccessedAt: {
      type: Date,
      default: Date.now,
    },
    revokedAt: {
      type: Date,
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

sessionSchema.index({ user: 1, isActive: 1 });
sessionSchema.index({ refreshTokenHash: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Session = mongoose.model('Session', sessionSchema);
export default Session;
