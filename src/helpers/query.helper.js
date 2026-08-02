import { parsePagination, buildDateRangeFilter } from '../utils/pagination.util.js';

/**
 * Build a standard list query object from req.query.
 * Handles pagination, date ranges, and search.
 *
 * @param {object} query  req.query
 * @param {object} options
 * @param {object} options.searchFields  Fields to apply text search on
 * @param {object} options.exactFields   Fields to match exactly from query
 * @param {string} options.dateField     Date field for range filter (default 'createdAt')
 * @returns {{ filter, pagination, sort }}
 */
export const buildListQuery = (query = {}, options = {}) => {
  const {
    searchFields = [],
    exactFields = [],
    dateField = 'createdAt',
    defaultSort = { createdAt: -1 },
  } = options;

  const pagination = parsePagination(query);
  const filter = {};

  // ── Text search ───────────────────────────────────────────
  if (query.search && searchFields.length > 0) {
    filter.$or = searchFields.map((field) => ({
      [field]: { $regex: query.search.trim(), $options: 'i' },
    }));
  }

  // ── Exact field matches ───────────────────────────────────
  for (const field of exactFields) {
    if (query[field] !== undefined && query[field] !== '') {
      filter[field] = query[field];
    }
  }

  // ── Date range ────────────────────────────────────────────
  const dateFilter = buildDateRangeFilter(query.startDate, query.endDate, dateField);
  Object.assign(filter, dateFilter);

  // ── Sort ──────────────────────────────────────────────────
  let sort = defaultSort;
  if (query.sortBy) {
    sort = {};
    sort[query.sortBy] = query.sortOrder === 'asc' ? 1 : -1;
  }

  return { filter, pagination, sort };
};

/**
 * Calculate skip value for MongoDB from page/limit.
 */
export const calcSkip = (page, limit) => (page - 1) * limit;
