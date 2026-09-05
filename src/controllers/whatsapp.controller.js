import { whatsappService } from '../services/whatsapp.service.js';
import { sendSuccess } from '../utils/response.util.js';
import { asyncHandler } from '../utils/async.util.js';
import { verifyAccessToken, verifyRefreshToken } from '../utils/jwt.util.js';
import { User } from '../models/index.js';
import { ROLES } from '../constants/roles.js';
import logger from '../config/logger.js';

export const whatsappController = {
  getStatus: asyncHandler(async (req, res) => {
    const status = whatsappService.getStatus();
    sendSuccess(res, {
      message: 'WhatsApp status retrieved',
      data: status,
    });
  }),

  connect: asyncHandler(async (req, res) => {
    const status = await whatsappService.init(false);
    sendSuccess(res, {
      message: 'WhatsApp connection initiated',
      data: status,
    });
  }),

  regenerateQR: asyncHandler(async (req, res) => {
    const status = await whatsappService.regenerateQR();
    sendSuccess(res, {
      message: 'Fresh WhatsApp QR code generated',
      data: status,
    });
  }),

  disconnect: asyncHandler(async (req, res) => {
    const result = await whatsappService.disconnect();
    sendSuccess(res, {
      message: result.message,
      data: result,
    });
  }),

  sendMessage: asyncHandler(async (req, res) => {
    const { number, message } = req.body;
    const result = await whatsappService.sendTextMessage(number, message);
    sendSuccess(res, {
      message: 'WhatsApp message sent successfully',
      data: result,
    });
  }),

  // SSE stream with query-param token auth (EventSource can't set headers)
  streamStatus: async (req, res) => {
    const token = req.query.token
      || req.headers.authorization?.replace('Bearer ', '').trim()
      || req.cookies?.accessToken;

    const refreshToken = req.query.refreshToken || req.cookies?.refreshToken;

    let decoded = null;

    if (token) {
      try {
        decoded = verifyAccessToken(token);
      } catch (_) {}
    }

    // If query token expired, check refreshToken
    if (!decoded && refreshToken) {
      try {
        decoded = verifyRefreshToken(refreshToken);
      } catch (_) {}
    }

    if (!decoded) {
      return res.status(401).json({ success: false, message: 'Invalid or expired token' });
    }

    try {
      const user = await User.findById(decoded.userId).lean();
      if (!user || !user.isActive || user.isBlocked) {
        return res.status(401).json({ success: false, message: 'User not found or inactive' });
      }
      if (![ROLES.SUPER_ADMIN, ROLES.ADMIN].includes(user.role)) {
        return res.status(403).json({ success: false, message: 'Insufficient permissions' });
      }
    } catch (err) {
      logger.warn('[WhatsApp SSE] User lookup failed:', err.message);
      return res.status(500).json({ success: false, message: 'Auth verification failed' });
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    // Send current status immediately
    const currentStatus = whatsappService.getStatus();
    res.write(`data: ${JSON.stringify({ event: 'status', data: currentStatus })}\n\n`);

    // Subscribe to live updates
    const unsubscribe = whatsappService.subscribe((event, data) => {
      try {
        res.write(`data: ${JSON.stringify({ event, data: { ...whatsappService.getStatus(), ...data } })}\n\n`);
      } catch {}
    });

    // Keep-alive ping every 15s
    const ping = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {}
    }, 15000);

    req.on('close', () => {
      clearInterval(ping);
      unsubscribe();
    });
  },
};
