import { HTTP_STATUS } from '../constants/http.js';

export const sendSuccess = (res, { message = 'Request successful', data = null, statusCode = HTTP_STATUS.OK } = {}) => {
  const body = { success: true, message };
  if (data !== null && data !== undefined) body.data = data;
  return res.status(statusCode).json(body);
};

export const sendError = (res, { message = 'An error occurred', errors = [], statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR } = {}) => {
  const body = { success: false, message };
  if (errors.length > 0) body.errors = errors;
  return res.status(statusCode).json(body);
};

export const paginatedResponse = (items, { page, limit, total }) => ({
  items,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  },
});
