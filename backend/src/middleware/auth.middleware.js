import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import asyncHandler from './asyncHandler.js';
import { ACCOUNT_STATUS } from '../config/constants.js';

/**
 * Protect middleware:
 * - Reads JWT from httpOnly cookie "mb_token" or "Authorization: Bearer <token>"
 * - Verifies token signature and expiry
 * - Loads user and checks account status
 * - Checks if password was changed after token issuance
 */
export const protect = asyncHandler(async (req, _res, next) => {
  let token = null;

  // 1. Read token from cookie or Authorization header
  if (req.cookies && req.cookies.mb_token) {
    token = req.cookies.mb_token;
  } else if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return next(new ApiError(401, 'Authentication required. Please sign in.'));
  }

  // 2. Verify token
  let decoded;
  try {
    decoded = jwt.verify(token, env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Your session has expired. Please sign in again.'));
    }
    return next(new ApiError(401, 'Invalid authentication token.'));
  }

  // 3. Find user
  const user = await User.findById(decoded.id);
  if (!user) {
    return next(new ApiError(401, 'The account belonging to this session no longer exists.'));
  }

  // 4. Check account status
  if (user.accountStatus === ACCOUNT_STATUS.BLOCKED) {
    return next(new ApiError(403, 'Your account has been blocked. Please contact support.'));
  }

  if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
    return next(new ApiError(403, 'Your account is currently suspended. Please contact support.'));
  }

  // 5. Check if password changed after token was issued
  if (user.passwordChangedAt) {
    const changedTimestamp = parseInt(user.passwordChangedAt.getTime() / 1000, 10);
    if (decoded.iat < changedTimestamp) {
      return next(
        new ApiError(401, 'Password was recently changed. Please sign in again.')
      );
    }
  }

  // Attach user to request
  req.user = user;
  next();
});

export default protect;
