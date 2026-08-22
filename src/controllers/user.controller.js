import { userService } from '../services/user.service.js';
import { authService } from '../services/auth.service.js';
import { sendSuccess, paginatedResponse } from '../utils/response.util.js';
import { asyncHandler } from '../utils/async.util.js';
import { HTTP_STATUS } from '../constants/http.js';

export const userController = {
  createUser: asyncHandler(async (req, res) => {
    const user = await authService.register(req.body, req.user.id);
    sendSuccess(res, {
      message: 'User created successfully',
      data: { user },
      statusCode: HTTP_STATUS.CREATED,
    });
  }),

  listUsers: asyncHandler(async (req, res) => {
    const { items, total } = await userService.listUsers(req.query);
    sendSuccess(res, {
      message: 'Users retrieved',
      data: paginatedResponse(items, {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 20,
        total,
      }),
    });
  }),

  getUser: asyncHandler(async (req, res) => {
    const user = await userService.getUser(req.params.id);
    sendSuccess(res, { message: 'User retrieved', data: { user } });
  }),

  updateUser: asyncHandler(async (req, res) => {
    const user = await userService.updateUser(req.params.id, req.body, req.user.id);
    sendSuccess(res, { message: 'User updated successfully', data: { user } });
  }),

  blockUser: asyncHandler(async (req, res) => {
    const user = await userService.blockUser(req.params.id, req.body.reason, req.user.id);
    sendSuccess(res, { message: 'User blocked successfully', data: { user } });
  }),

  unblockUser: asyncHandler(async (req, res) => {
    const user = await userService.unblockUser(req.params.id, req.user.id);
    sendSuccess(res, { message: 'User unblocked successfully', data: { user } });
  }),

  deleteUser: asyncHandler(async (req, res) => {
    await userService.deleteUser(req.params.id, req.user.id);
    sendSuccess(res, { message: 'User deleted successfully' });
  }),

  toggleApiAccess: asyncHandler(async (req, res) => {
    const user = await userService.getUser(req.params.id);
    const updated = await userService.updateUser(
      req.params.id,
      { apiAccessEnabled: !user.apiAccessEnabled },
      req.user.id,
    );
    sendSuccess(res, {
      message: `API access ${updated.apiAccessEnabled ? 'enabled' : 'disabled'} for ${updated.name}`,
      data: { apiAccessEnabled: updated.apiAccessEnabled },
    });
  }),

  updateCommission: asyncHandler(async (req, res) => {
    const { commissionRate } = req.body;
    const updated = await userService.updateCommission(req.params.id, commissionRate, req.user.id);
    const rate = parseFloat(commissionRate);
    sendSuccess(res, {
      message: `Commission updated to ${(rate * 100).toFixed(2)}%`,
      data: { user: updated },
    });
  }),
};
