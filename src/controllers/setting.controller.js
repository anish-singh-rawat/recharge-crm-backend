import { settingService } from '../services/setting.service.js';
import { sendSuccess, paginatedResponse } from '../utils/response.util.js';
import { asyncHandler } from '../utils/async.util.js';

export const settingController = {
  listSettings: asyncHandler(async (req, res) => {
    const { items, total } = await settingService.list(req.query);
    sendSuccess(res, {
      message: 'Settings retrieved',
      data: paginatedResponse(items, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        total,
      }),
    });
  }),

  getPublicSettings: asyncHandler(async (req, res) => {
    const settings = await settingService.getPublic();
    sendSuccess(res, { message: 'Public settings retrieved', data: { settings } });
  }),

  getSetting: asyncHandler(async (req, res) => {
    const setting = await settingService.getByKey(req.params.key);
    sendSuccess(res, { message: 'Setting retrieved', data: { setting } });
  }),

  updateSetting: asyncHandler(async (req, res) => {
    const setting = await settingService.update(req.params.key, req.body.value, req.user.id);
    sendSuccess(res, { message: 'Setting updated successfully', data: { setting } });
  }),

  bulkUpdateSettings: asyncHandler(async (req, res) => {
    const results = await settingService.bulkUpdate(req.body.settings, req.user.id);
    sendSuccess(res, { message: 'Settings updated', data: { results } });
  }),
};
