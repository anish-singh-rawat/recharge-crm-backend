import { activityLogRepository, auditLogRepository, webhookLogRepository } from '../repositories/log.repository.js';
import { sendSuccess, paginatedResponse } from '../utils/response.util.js';
import { asyncHandler } from '../utils/async.util.js';
import { parsePagination } from '../utils/pagination.util.js';
import { buildDateRangeFilter } from '../utils/pagination.util.js';

export const logController = {
  getActivityLogs: asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = buildDateRangeFilter(req.query.startDate, req.query.endDate);
    if (req.query.userId) filter.user = req.query.userId;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.module) filter.module = req.query.module;

    const { items, total } = await activityLogRepository.findPaginatedLogs(filter, {
      page, limit, skip,
    });
    sendSuccess(res, {
      message: 'Activity logs retrieved',
      data: paginatedResponse(items, { page, limit, total }),
    });
  }),

  getAuditLogs: asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = buildDateRangeFilter(req.query.startDate, req.query.endDate);
    if (req.query.performedBy) filter.performedBy = req.query.performedBy;
    if (req.query.action) filter.action = req.query.action;
    if (req.query.severity) filter.severity = req.query.severity;

    const { items, total } = await auditLogRepository.findPaginatedAudit(filter, {
      page, limit, skip,
    });
    sendSuccess(res, {
      message: 'Audit logs retrieved',
      data: paginatedResponse(items, { page, limit, total }),
    });
  }),

  getWebhookLogs: asyncHandler(async (req, res) => {
    const { page, limit, skip } = parsePagination(req.query);
    const filter = buildDateRangeFilter(req.query.startDate, req.query.endDate);
    if (req.query.provider) filter.provider = req.query.provider;
    if (req.query.isProcessed !== undefined) filter.isProcessed = req.query.isProcessed === 'true';

    const { items, total } = await webhookLogRepository.findPaginated(filter, {
      page, limit, skip, sort: { createdAt: -1 },
    });
    sendSuccess(res, {
      message: 'Webhook logs retrieved',
      data: paginatedResponse(items, { page, limit, total }),
    });
  }),
};
