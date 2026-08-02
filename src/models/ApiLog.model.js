import mongoose from 'mongoose';

const apiLogSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      trim: true,
    },
    correlationId: {
      type: String,
      trim: true,
      default: null,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    method: {
      type: String,
      required: true,
      uppercase: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    requestBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      select: false,
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      select: false,
    },
    requestHeaders: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      select: false,
    },
    responseTime: {
      type: Number, // milliseconds
      default: 0,
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    isError: {
      type: Boolean,
      default: false,
    },
    errorMessage: {
      type: String,
      default: '',
    },
    provider: {
      type: String,
      default: null, // 'MROBOTICS' for provider API calls
    },
    providerEndpoint: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

apiLogSchema.index({ requestId: 1 });
apiLogSchema.index({ user: 1, createdAt: -1 });
apiLogSchema.index({ isError: 1, createdAt: -1 });
apiLogSchema.index({ provider: 1, createdAt: -1 });
// TTL: auto-delete after 30 days
apiLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 30 * 24 * 60 * 60 },
);

const ApiLog = mongoose.model('ApiLog', apiLogSchema);
export default ApiLog;
