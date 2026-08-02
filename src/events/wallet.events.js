import emitter from './emitter.js';
import { getIO } from '../socket/socket.js';
import logger from '../config/logger.js';

export const WALLET_EVENTS = {
  BALANCE_UPDATED: 'wallet:balance_updated',
  FROZEN: 'wallet:frozen',
  UNFROZEN: 'wallet:unfrozen',
};

emitter.on(WALLET_EVENTS.BALANCE_UPDATED, ({ userId, balance, transaction }) => {
  try {
    getIO().to(`user:${userId}`).emit('wallet:update', { balance, transaction });
  } catch {
    // socket not ready
  }
});

emitter.on(WALLET_EVENTS.FROZEN, ({ userId }) => {
  try {
    getIO().to(`user:${userId}`).emit('wallet:frozen');
  } catch {
    // socket not ready
  }
});

emitter.on(WALLET_EVENTS.UNFROZEN, ({ userId }) => {
  try {
    getIO().to(`user:${userId}`).emit('wallet:unfrozen');
  } catch {
    // socket not ready
  }
});

export const emitWalletBalanceUpdated = (userId, balance, transaction = null) => {
  emitter.emit(WALLET_EVENTS.BALANCE_UPDATED, { userId, balance, transaction });
};
