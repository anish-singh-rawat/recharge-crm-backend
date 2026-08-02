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

export const maskSensitiveFields = (obj, fields = ['password', 'token', 'secret', 'apiKey', 'cardNumber', 'cvv']) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  const result = { ...obj };
  for (const field of fields) {
    if (field in result) result[field] = '***REDACTED***';
  }
  return result;
};

export const maskAccountNumber = (number) => {
  if (!number || number.length < 4) return '****';
  return '*'.repeat(number.length - 4) + number.slice(-4);
};

export const maskEmail = (email) => {
  if (!email || !email.includes('@')) return '***';
  const [local, domain] = email.split('@');
  return `${local[0]}${'*'.repeat(Math.max(local.length - 1, 3))}@${domain}`;
};

export const maskPhone = (phone) => {
  if (!phone || phone.length < 4) return '****';
  return '*'.repeat(phone.length - 4) + phone.slice(-4);
};
