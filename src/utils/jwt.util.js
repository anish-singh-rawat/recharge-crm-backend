import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Sign an access token.
 * @param {object} payload
 * @returns {string} signed JWT
 */
export const signAccessToken = (payload) =>
  jwt.sign(payload, env.jwt.secret, { expiresIn: env.jwt.expiresIn });

/**
 * Sign a refresh token.
 * @param {object} payload
 * @returns {string} signed JWT
 */
export const signRefreshToken = (payload) =>
  jwt.sign(payload, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn });

/**
 * Verify an access token.
 * @param {string} token
 * @returns {object} decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
export const verifyAccessToken = (token) =>
  jwt.verify(token, env.jwt.secret);

/**
 * Verify a refresh token.
 * @param {string} token
 * @returns {object} decoded payload
 * @throws {JsonWebTokenError|TokenExpiredError}
 */
export const verifyRefreshToken = (token) =>
  jwt.verify(token, env.jwt.refreshSecret);

/**
 * Decode a token without verification (for reading expiry etc.)
 * @param {string} token
 * @returns {object|null}
 */
export const decodeToken = (token) => jwt.decode(token);

/**
 * Extract the bearer token string from Authorization header.
 * @param {string} authHeader  e.g. "Bearer eyJhbG..."
 * @returns {string|null}
 */
export const extractBearerToken = (authHeader) => {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  return token || null;
};
