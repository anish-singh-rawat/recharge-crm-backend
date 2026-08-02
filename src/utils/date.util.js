export const addMinutes = (date, minutes) =>
  new Date(date.getTime() + minutes * 60 * 1000);

export const addHours = (date, hours) =>
  new Date(date.getTime() + hours * 60 * 60 * 1000);

export const addDays = (date, days) =>
  new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

export const isExpired = (date) => date && new Date(date) < new Date();

export const startOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const endOfDay = (date = new Date()) => {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
};

export const toDateString = (date = new Date()) =>
  new Date(date).toISOString().slice(0, 10);

export const backoffDelay = (attempt, baseMs = 1000, multiplier = 2, maxMs = 30000) => {
  const delay = baseMs * Math.pow(multiplier, attempt);
  const jitter = delay * 0.1 * (Math.random() * 2 - 1);
  return Math.min(Math.round(delay + jitter), maxMs);
};
