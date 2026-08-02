import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import env from '../config/env.js';

const ENCRYPTION_KEY = env.apiKey.encryptionSecret;

export const sha256Hash = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');

export const hmacSHA256 = (secret, data) =>
  crypto.createHmac('sha256', secret).update(data).digest('hex');

export const safeCompare = (a, b) => {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
};

export const encryptAES = (plaintext) =>
  CryptoJS.AES.encrypt(plaintext, ENCRYPTION_KEY).toString();

export const decryptAES = (ciphertext) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

export const generateSecureToken = (byteLength = 32) =>
  crypto.randomBytes(byteLength).toString('hex');

export const generateApiKey = () => {
  const random = crypto.randomBytes(24).toString('hex');
  return `crm_${random}`;
};

export const getApiKeyPrefix = (key) => {
  if (key.startsWith('crm_')) return key.slice(4, 12);
  return key.slice(0, 8);
};
