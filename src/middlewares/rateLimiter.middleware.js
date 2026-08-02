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

/**
 * General API rate limiter — applies to all routes.
 */
export const generalRateLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitResponse,
  skipSuccessfulRequests: false,
  keyGenerator: (req) => req.ip,
});

/**
 * Strict auth rate limiter — login, forgot-password, etc.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(HTTP_STATUS.TOO_MANY_REQUESTS).json({
      success: false,
      message: 'Too many authentication attempts. Please try again in 15 minutes.',
      errors: [],
    });
  },
  keyGenerator: (req) => req.ip,
});

/**
 * Recharge API rate limiter — per user per minute.
 */
export const rechargeRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
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

/**
 * Password-reset rate limiter — very strict.
 */
export const passwordResetRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
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
