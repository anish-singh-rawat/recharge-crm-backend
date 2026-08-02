import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export const generateTxnId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `TXN${ts}${rand}`;
};

export const generateRequestId = () => `REQ-${uuidv4()}`;

export const generateCorrelationId = () => `COR-${uuidv4()}`;

export const generateWalletTxnId = () => {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `WTX${ts}${rand}`;
};

export const generateOpaqueToken = () =>
  crypto.randomBytes(32).toString('hex');
