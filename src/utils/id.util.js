import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Generate a unique transaction ID.
 * Format: TXN<timestamp><6-char-random>
 */
export const generateTxnId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TXN${ts}${rand}`;
};

/**
 * Generate a unique request ID for tracing.
 */
export const generateRequestId = () => `REQ-${uuidv4()}`;

/**
 * Generate a correlation ID to link related operations.
 */
export const generateCorrelationId = () => `COR-${uuidv4()}`;

/**
 * Generate a wallet transaction ID.
 * Format: WTX<timestamp><6-char-random>
 */
export const generateWalletTxnId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `WTX${ts}${rand}`;
};

/**
 * Generate a password reset / email verification token.
 */
export const generateOpaqueToken = () =>
  crypto.randomBytes(32).toString('hex');
