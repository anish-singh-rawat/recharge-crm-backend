/**
 * Add minutes to a Date.
 * @param {Date} date
 * @param {number} minutes
 * @returns {Date}
 */
export const addMinutes = (date, minutes) =>
  new Date(date.getTime() + minutes * 60 * 1000);

/**
 * Add hours to a Date.
 */
export const addHours = (date, hours) =>
  new Date(date.getTime() + hours * 60 * 60 * 1000);

/**
 * Add days to a Date.
 */
export const addDays = (date, days) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

/**
 * Check if a date has expired.
 */
export const isExpired = (date) => date && new Date(date) < new Date();

/**
 * Return start of a given day (00:00:00.000).
 */
export const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Return end of a given day (23:59:59.999).
 */
export const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

/**
 * Format a Date to 'YYYY-MM-DD' string.
 */
export const toDateString = (date = new Date()) =>
  new Date(date).toISOString().slice(0, 10);

/**
 * Exponential backoff delay calculator.
 * @param {number} attempt  0-indexed attempt number
 * @param {number} baseMs
 * @param {number} multiplier
 * @param {number} maxMs
 * @returns {number} delay in ms
 */
export const backoffDelay = (attempt, baseMs = 1000, multiplier = 2, maxMs = 30000) => {
  const delay = baseMs * Math.pow(multiplier, attempt);
  // Add jitter ±10%
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.min(Math.round(delay + jitter), maxMs);
};
