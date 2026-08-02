import { Server } from 'socket.io';
import { verifyAccessToken } from '../utils/jwt.util.js';
import { User } from '../models/index.js';
import logger from '../config/logger.js';
import env from '../config/env.js';

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: env.app.allowedOrigins,
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token
        || socket.handshake.headers?.authorization?.replace('Bearer ', '');

      if (!token) return next(new Error('Authentication required'));

      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.userId).lean();

      if (!user || !user.isActive || user.isBlocked) {
        return next(new Error('User account unavailable'));
      }

      socket.userId = user._id.toString();
      socket.userRole = user.role;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug('Socket connected', { userId: socket.userId, socketId: socket.id });

    socket.join(`user:${socket.userId}`);

    if (['super_admin', 'admin'].includes(socket.userRole)) {
      socket.join('admins');
    }

    socket.on('join:room', (room) => {
      if (typeof room === 'string' && room.startsWith('user:')) {
        socket.join(room);
      }
    });

    socket.on('disconnect', (reason) => {
      logger.debug('Socket disconnected', { userId: socket.userId, reason });
    });
  });

  logger.info('Socket.IO initialised');
  return io;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.IO not initialised');
  return io;
};
