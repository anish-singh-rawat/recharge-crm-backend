import { parsePagination, buildDateRangeFilter } from '../utils/pagination.util.js';

export const buildListQuery = (query = {}, options = {}) => {
  const {
    searchFields = [],
    exactFields = [],
    dateField = 'createdAt',
    defaultSort = { createdAt: -1 },
  } = options;

  const pagination = parsePagination(query);
  const filter = {};

  if (query.search && searchFields.length > 0) {
    filter.$or = searchFields.map((field) => ({
      [field]: { $regex: query.search.trim(), $options: 'i' },
    }));
  }

  for (const field of exactFields) {
    if (query[field] !== undefined && query[field] !== '') {
      filter[field] = query[field];
    }
  }

  const dateFilter = buildDateRangeFilter(query.startDate, query.endDate, dateField);
  Object.assign(filter, dateFilter);

  let sort = defaultSort;
  if (query.sortBy) {
    sort = {};
    sort[query.sortBy] = query.sortOrder === 'asc' ? 1 : -1;
  }

  return { filter, pagination, sort };
};

export const calcSkip = (page, limit) => (page - 1) * limit;
