import mongoose from 'mongoose';
import { AUDIT_SEVERITY } from '../constants/audit.js';

const auditLogSchema = new mongoose.Schema(
  {
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
    severity: {
      type: String,
      enum: Object.values(AUDIT_SEVERITY),
      default: AUDIT_SEVERITY.LOW,
    },
    module: {
      type: String,
      trim: true,
      default: '',
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    previousValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      select: false,
    },
    newValue: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      select: false,
    },
    referenceId: {
      type: String,
      default: null,
    },
    referenceType: {
      type: String,
      default: null,
    },
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

auditLogSchema.index({ performedBy: 1, createdAt: -1 });
auditLogSchema.index({ targetUser: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, severity: 1, createdAt: -1 });
auditLogSchema.index({ module: 1, createdAt: -1 });
auditLogSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: 365 * 24 * 60 * 60 },
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
