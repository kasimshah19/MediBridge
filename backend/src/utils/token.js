import jwt from 'jsonwebtoken';
import env from '../config/env.js';

/**
 * Sign JWT token for user ID or user object.
 *
 * @param {string|object} userOrId
 * @param {boolean} rememberMe - Whether to extend expiry to 30 days
 * @param {number} [tokenVersionOverride]
 * @returns {string} Signed JWT token
 */
export const generateToken = (userOrId, rememberMe = false, tokenVersionOverride) => {
  let userId = userOrId;
  let tokenVersion = tokenVersionOverride !== undefined ? tokenVersionOverride : 0;

  if (userOrId && typeof userOrId === 'object') {
    userId = userOrId._id || userOrId.id;
    if (userOrId.tokenVersion !== undefined) {
      tokenVersion = userOrId.tokenVersion;
    }
  }

  const expiresIn = rememberMe ? '30d' : env.JWT_EXPIRES_IN;
  return jwt.sign({ id: userId, tokenVersion }, env.JWT_SECRET, { expiresIn });
};

/**
 * Set HTTP-only secure cookie with JWT token.
 *
 * @param {import('express').Response} res
 * @param {string} token
 * @param {boolean} rememberMe
 */
export const setAuthCookie = (res, token, rememberMe = false) => {
  const maxAge = rememberMe
    ? 30 * 24 * 60 * 60 * 1000 // 30 days
    : 7 * 24 * 60 * 60 * 1000; // 7 days

  const isProduction = env.NODE_ENV === 'production';
  const secure = env.COOKIE_SECURE !== undefined ? env.COOKIE_SECURE : isProduction;

  res.cookie('mb_token', token, {
    httpOnly: true,
    secure,
    sameSite: isProduction ? 'none' : 'lax',
    maxAge,
    path: '/',
  });
};

/**
 * Clear the auth cookie on logout.
 *
 * @param {import('express').Response} res
 */
export const clearAuthCookie = (res) => {
  const isProduction = env.NODE_ENV === 'production';
  const secure = env.COOKIE_SECURE !== undefined ? env.COOKIE_SECURE : isProduction;

  res.cookie('mb_token', '', {
    httpOnly: true,
    secure,
    sameSite: isProduction ? 'none' : 'lax',
    expires: new Date(0),
    path: '/',
  });
};

