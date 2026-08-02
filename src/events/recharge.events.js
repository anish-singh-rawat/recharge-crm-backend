import emitter from './emitter.js';
import { getIO } from '../socket/socket.js';
import logger from '../config/logger.js';

export const RECHARGE_EVENTS = {
  STATUS_UPDATED: 'recharge:status_updated',
  INITIATED: 'recharge:initiated',
  SUCCESS: 'recharge:success',
  FAILED: 'recharge:failed',
  REFUNDED: 'recharge:refunded',
};

emitter.on(RECHARGE_EVENTS.STATUS_UPDATED, ({ userId, txnId, status, transaction }) => {
  try {
    const io = getIO();
    io.to(`user:${userId}`).emit('recharge:update', { txnId, status, transaction });
    io.to('admins').emit('recharge:update:all', { userId, txnId, status });
  } catch (err) {
    logger.debug('Socket emit skipped (not initialised)', { event: RECHARGE_EVENTS.STATUS_UPDATED });
  }
});

emitter.on(RECHARGE_EVENTS.SUCCESS, ({ userId, transaction }) => {
  try {
    getIO().to(`user:${userId}`).emit('recharge:success', { transaction });
  } catch {
    // socket not ready
  }
});

emitter.on(RECHARGE_EVENTS.FAILED, ({ userId, transaction }) => {
  try {
    getIO().to(`user:${userId}`).emit('recharge:failed', { transaction });
  } catch {
    // socket not ready
  }
});

export const emitRechargeStatusUpdated = (userId, txnId, status, transaction = null) => {
  emitter.emit(RECHARGE_EVENTS.STATUS_UPDATED, { userId, txnId, status, transaction });
};
