import env from '../config/env.js';

/**
 * Parse and normalise pagination query params.
 * @param {object} query  req.query
 * @returns {{ page, limit, skip }}
 */
export const parsePagination = (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const rawLimit = parseInt(query.limit, 10) || env.pagination.defaultPageSize;
  const limit = Math.min(rawLimit, env.pagination.maxPageSize);
  const skip = (page - 1) * limit;
  return { page, limit, skip };
};

/**
 * Parse sort query param.
 * e.g. "createdAt:desc,amount:asc"  →  { createdAt: -1, amount: 1 }
 * @param {string} sortStr
 * @param {object} allowedFields  Whitelist of sortable field names
 * @param {object} defaultSort
 * @returns {object}
 */
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

/**
 * Build a date-range filter object for MongoDB queries.
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @param {string} field  Field to apply range on (default 'createdAt')
 * @returns {object}
 */
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
