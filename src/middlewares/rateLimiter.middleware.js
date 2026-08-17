import rateLimit from 'express-rate-limit';
import env from '../config/env.js';
import { HTTP_STATUS } from '../constants/http.js';

const rateLimitResponse = (req, res) => {
  res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    errors: [],
  });
};

export const generalRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.ip,
});

export const authRateLimiter = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many failed login attempts. Your IP has been blocked for 30 minutes.',
      errors: [],
    });
  },
  keyGenerator: (req) => req.ip,
});

export const rechargeRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: env.rateLimit.rechargeMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many recharge requests. Please slow down.',
      errors: [],
    });
  },
  keyGenerator: (req) => (req.user ? req.user.id : req.ip),
});

export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many password reset requests. Try again after 1 hour.',
      errors: [],
    });
  },
  keyGenerator: (req) => req.ip,
});
