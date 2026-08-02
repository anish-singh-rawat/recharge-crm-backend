import env from '../config/env.js';

export const parsePagination = (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const rawLimit = parseInt(query.limit, 10) || env.pagination.defaultPageSize;
  const limit = Math.min(rawLimit, env.pagination.maxPageSize);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

export const parseSort = (sortStr, allowedFields = {}, defaultSort = { createdAt: -1 }) => {
  if (!sortStr) return defaultSort;
  const sort = {};
  sortStr.split(',').forEach((part) => {
    const [field, dir] = part.trim().split(':');
    if (allowedFields[field] || Object.keys(allowedFields).length === 0) {
      sort[field] = dir === 'asc' ? 1 : -1;
    }
  });
  return Object.keys(sort).length ? sort : defaultSort;
};

export const buildDateRangeFilter = (startDate, endDate, field = 'createdAt') => {
  const filter = {};
  if (startDate || endDate) {
    filter[field] = {};
    if (startDate) filter[field].$gte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      filter[field].$lte = end;
    }
  }
  return filter;
};
