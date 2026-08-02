import emitter from './emitter.js';
import { getIO } from '../socket/socket.js';

export const NOTIFICATION_EVENTS = {
  NEW: 'notification:new',
  BROADCAST: 'notification:broadcast',
};

emitter.on(NOTIFICATION_EVENTS.NEW, ({ userId, notification }) => {
  try {
    getIO().to(`user:${userId}`).emit('notification:new', { notification });
  } catch {
    // socket not ready
  }
});

emitter.on(NOTIFICATION_EVENTS.BROADCAST, ({ notification }) => {
  try {
    getIO().emit('notification:broadcast', { notification });
  } catch {
    // socket not ready
  }
});

export const emitNewNotification = (userId, notification) => {
  emitter.emit(NOTIFICATION_EVENTS.NEW, { userId, notification });
};

export const emitBroadcastNotification = (notification) => {
  emitter.emit(NOTIFICATION_EVENTS.BROADCAST, { notification });
};
