import env from '../config/env.js';
import { getISTStartOfDay, getISTEndOfDay } from './date.util.js';

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

export const parseISTDate = (dateVal, isEndOfDay = false) => {
  if (!dateVal) return null;
  if (dateVal instanceof Date) {
    return isEndOfDay ? getISTEndOfDay(dateVal) : getISTStartOfDay(dateVal);
  }
  const str = String(dateVal).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return new Date(`${str}T${isEndOfDay ? '23:59:59.999' : '00:00:00.000'}+05:30`);
  }
  const d = new Date(str);
  if (isNaN(d.getTime())) return null;
  return d;
};

export const buildDateRangeFilter = (startDate, endDate, field = 'createdAt') => {
  const filter = {};
  if (startDate || endDate) {
    filter[field] = {};
    if (startDate) {
      const start = parseISTDate(startDate, false);
      if (start) filter[field].$gte = start;
    }
    if (endDate) {
      const end = parseISTDate(endDate, true);
      if (end) filter[field].$lte = end;
    }
  }
  return filter;
};
