/**
 * Strip MongoDB operator keys ($) from a plain object (recursive).
 * Use as a secondary guard beyond express-mongo-sanitize middleware.
 */
export const sanitizeMongoObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeMongoObject);

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (key.startsWith('$')) continue;
    result[key] = sanitizeMongoObject(value);
  }
  return result;
};

/**
 * Mask sensitive fields for safe logging.
 * @param {object} obj
 * @param {string[]} fields  Field names to mask
 * @returns {object}
 */
export const maskSensitiveFields = (obj, fields = ['password', 'token', 'secret', 'apiKey', 'cardNumber', 'cvv']) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  const result = { ...obj };
  for (const field of fields) {
    if (field in result) result[field] = '***REDACTED***';
  }
  return result;
};

/**
 * Redact card/account numbers, keeping last 4 digits.
 * e.g. "9876543210" → "******3210"
 */
export const maskAccountNumber = (number) => {
  if (!number || number.length < 4) return '****';
  return '*'.repeat(number.length - 4) + number.slice(-4);
};

/**
 * Mask email: show first char + domain.
 * e.g. "john@example.com" → "j***@example.com"
 */
export const maskEmail = (email) => {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  return `${local[0]}${'*'.repeat(Math.max(local.length - 1, 3))}@${domain}`;
};

/**
 * Mask phone: show last 4 digits.
 * e.g. "9876543210" → "******3210"
 */
export const maskPhone = (phone) => {
  if (!phone || phone.length < 4) return '****';
  return '*'.repeat(phone.length - 4) + phone.slice(-4);
};
