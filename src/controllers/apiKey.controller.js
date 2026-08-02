import { apiKeyService } from '../services/apiKey.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { asyncHandler } from '../utils/async.util.js';
import { HTTP_STATUS } from '../constants/http.js';

export const apiKeyController = {
  createApiKey: asyncHandler(async (req, res) => {
    const result = await apiKeyService.create(req.user.id, req.body);
    sendSuccess(res, {
      message: 'API key created. Store the rawKey securely — it will not be shown again.',
      data: result,
      statusCode: HTTP_STATUS.CREATED,
    });
  }),

  listApiKeys: asyncHandler(async (req, res) => {
    const keys = await apiKeyService.list(req.user.id);
    sendSuccess(res, { message: 'API keys retrieved', data: { keys } });
  }),

  getApiKey: asyncHandler(async (req, res) => {
    const key = await apiKeyService.getById(req.params.id, req.user.id, req.user.role);
    sendSuccess(res, { message: 'API key retrieved', data: { key } });
  }),

  revokeApiKey: asyncHandler(async (req, res) => {
    const key = await apiKeyService.revoke(
      req.params.id,
      req.user.id,
      req.user.role,
      req.body.reason,
    );
    sendSuccess(res, { message: 'API key revoked successfully', data: { key } });
  }),
};
