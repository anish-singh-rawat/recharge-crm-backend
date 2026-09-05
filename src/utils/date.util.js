export const addMinutes = (date, minutes) =>
  new Date(date.getTime() + minutes * 60 * 1000);

export const addHours = (date, hours) =>
  new Date(date.getTime() + hours * 60 * 60 * 1000);

export const addDays = (date, days) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

export const isExpired = (date) => date && new Date(date) < new Date();

export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export const getISTStartOfDay = (date = new Date(), timeZone = DEFAULT_TIMEZONE) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(date instanceof Date ? date : new Date(date));
  return new Date(`${dateStr}T00:00:00.000+05:30`);
};

export const getISTEndOfDay = (date = new Date(), timeZone = DEFAULT_TIMEZONE) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateStr = formatter.format(date instanceof Date ? date : new Date(date));
  return new Date(`${dateStr}T23:59:59.999+05:30`);
};

export const startOfDay = (date = new Date()) => getISTStartOfDay(date);

export const endOfDay = (date = new Date()) => getISTEndOfDay(date);

export const toDateString = (date = new Date()) =>
  new Date(date).toISOString().slice(0, 10);

export const backoffDelay = (attempt, baseMs = 1000, multiplier = 2, maxMs = 30000) => {
  const delay = baseMs * Math.pow(multiplier, attempt);
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.min(Math.round(delay + jitter), maxMs);
};
