import { ActivityLog, AuditLog, ApiLog, WebhookLog } from '../models/index.js';
import { BaseRepository } from './base.repository.js';

class ActivityLogRepository extends BaseRepository {
  constructor() {
    super(ActivityLog);
  }

  async findByUser(userId, filter = {}, paginationOptions = {}) {
    return this.findPaginated(
      { user: userId, ...filter },
      { ...paginationOptions, sort: { createdAt: -1 } },
    );
  }

  async findPaginatedLogs(filter = {}, paginationOptions = {}) {
    return this.findPaginated(filter, {
      ...paginationOptions,
      sort: { createdAt: -1 },
      populate: [{ path: 'user', select: 'name email role' }],
    });
  }

  async deleteOlderThan(days) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return ActivityLog.deleteMany({ createdAt: { $lt: cutoff } });
  }

  async deleteAll() {
    return ActivityLog.deleteMany({});
  }
}

class AuditLogRepository extends BaseRepository {
  constructor() {
    super(AuditLog);
  }

  async findPaginatedAudit(filter = {}, paginationOptions = {}) {
    return this.findPaginated(filter, {
      ...paginationOptions,
      sort: { createdAt: -1 },
      populate: [
        { path: 'performedBy', select: 'name email role' },
        { path: 'targetUser', select: 'name email role' },
      ],
    });
  }

  async deleteAll() {
    return AuditLog.deleteMany({});
  }
}

class WebhookLogRepository extends BaseRepository {
  constructor() {
    super(WebhookLog);
  }

  async findByProviderTxnId(providerTxnId) {
    return WebhookLog.findOne({ providerTxnId }).lean();
  }

  async findByIdempotencyKey(key) {
    return WebhookLog.findOne({ idempotencyKey: key }).lean();
  }

  async findUnprocessed() {
    return WebhookLog.find({
      isProcessed: false,
      isDuplicate: false,
    })
      .limit(50)
      .lean();
  }

  async markProcessed(id, error = null) {
    return WebhookLog.findByIdAndUpdate(
      id,
      {
        $set: {
          isProcessed: !error,
          processedAt: new Date(),
          processingError: error || null,
        },
      },
      { new: true },
    ).lean();
  }

  async markDuplicate(id) {
    return WebhookLog.findByIdAndUpdate(
      id,
      { $set: { isDuplicate: true, isProcessed: true, processedAt: new Date() } },
      { new: true },
    ).lean();
  }

  async deleteOlderThan(days) {
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return WebhookLog.deleteMany({ createdAt: { $lt: cutoff }, isProcessed: true });
  }

  async deleteAll() {
    return WebhookLog.deleteMany({});
  }
}

export const activityLogRepository = new ActivityLogRepository();
export const auditLogRepository = new AuditLogRepository();
export const webhookLogRepository = new WebhookLogRepository();
