import crypto from 'crypto';
import CryptoJS from 'crypto-js';
import env from '../config/env.js';

const ENCRYPTION_KEY = env.apiKey.encryptionSecret;

// ── SHA-256 hash (for API key storage) ───────────────────────────────────────
export const sha256Hash = (value) =>
  crypto.createHash('sha256').update(value).digest('hex');

// ── HMAC-SHA256 (for webhook signature verification) ──────────────────────────
export const hmacSHA256 = (secret, data) =>
  crypto.createHmac('sha256', secret).update(data).digest('hex');

/**
 * Timing-safe string comparison (prevents timing attacks).
 */
export const safeCompare = (a, b) => {
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
};

// ── AES encryption/decryption (for storing API keys) ─────────────────────────
export const encryptAES = (plaintext) =>
  CryptoJS.AES.encrypt(plaintext, ENCRYPTION_KEY).toString();

export const decryptAES = (ciphertext) => {
  const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// ── Secure random string generation ──────────────────────────────────────────
export const generateSecureToken = (byteLength = 32) =>
  crypto.randomBytes(byteLength).toString('hex');

/**
 * Generate a random API key in format: crm_<prefix>_<randomHex>
 */
export const generateApiKey = () => {
  const random = crypto.randomBytes(24).toString('hex');
  return `crm_${random}`;
};

/**
 * Extract the prefix of an API key (first 8 chars after "crm_").
 */
export const getApiKeyPrefix = (key) => {
  if (key.startsWith('crm_')) return key.slice(4, 12);
  return key.slice(0, 8);
};
