import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import toSafeUser from '../utils/toSafeUser.js';
import { generateToken, setAuthCookie, clearAuthCookie } from '../utils/token.js';
import { recordAuditLog } from '../services/audit.service.js';
import { sendPasswordResetEmail } from '../services/email.service.js';
import asyncHandler from '../middleware/asyncHandler.js';
import {
  ROLES,
  ACCOUNT_STATUS,
  APPROVAL_STATUS,
  AUDIT_ACTIONS,
} from '../config/constants.js';

/**
 * Register a new user (donor, pharmacist, or ngo).
 * Admin registration through public API is strictly rejected with 403.
 *
 * @route POST /api/auth/register
 */
export const register = asyncHandler(async (req, res, next) => {
  const {
    name,
    email,
    phone,
    password,
    role,
    city,
    state,
    address,
    licenseNumber,
    pharmacyName,
    registrationState,
    experienceYears,
    organizationName,
    designation,
  } = req.body;

  // 1. Strict guard: reject admin role registration
  if (role === ROLES.ADMIN || req.body.role === 'admin') {
    return next(new ApiError(403, 'Registration as administrator is strictly forbidden.'));
  }

  // 2. Check for duplicate email
  const existingUser = await User.findOne({ email: email.toLowerCase() });
  if (existingUser) {
    return next(new ApiError(409, 'An account with this email address already exists.'));
  }

  // 3. Hash password using bcryptjs (12 salt rounds)
  const passwordHash = await bcrypt.hash(password, 12);

  // 4. Construct user payload
  const userData = {
    name,
    email: email.toLowerCase(),
    phone,
    passwordHash,
    role,
    city,
    state: state || '',
    address: address || '',
    approvalStatus:
      role === ROLES.DONOR ? APPROVAL_STATUS.NOT_REQUIRED : APPROVAL_STATUS.PENDING,
  };

  if (role === ROLES.PHARMACIST) {
    userData.pharmacistProfile = {
      licenseNumber,
      pharmacyName,
      registrationState,
      experienceYears: experienceYears || 0,
    };
  }

  if (role === ROLES.NGO) {
    userData.ngoContact = {
      organizationName,
      designation,
    };
  }

  // 5. Create user in database
  const user = await User.create(userData);

  // 6. Record audit log
  await recordAuditLog({
    userId: user._id,
    action: AUDIT_ACTIONS.REGISTER,
    req,
    meta: { role: user.role, email: user.email },
  });

  // 7. Generate JWT & set cookie for seamless onboarding
  const token = generateToken(user._id);
  setAuthCookie(res, token, false);

  res.status(201).json(
    new ApiResponse(
      201,
      {
        user: toSafeUser(user),
        token,
      },
      user.approvalStatus === APPROVAL_STATUS.PENDING
        ? 'Registration submitted. Account is pending verification by administration.'
        : 'Registration successful. Welcome to MediBridge!'
    )
  );
});

/**
 * Sign in existing user with email and password.
 * Implements 5-attempt lockout for 15 minutes, generic error messages, and httpOnly cookie.
 *
 * @route POST /api/auth/login
 */
export const login = asyncHandler(async (req, res, next) => {
  const { email, password, rememberMe = false } = req.body;

  // 1. Fetch user including passwordHash for comparison
  const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');

  if (!user) {
    await recordAuditLog({
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      req,
      meta: { email: email.toLowerCase(), reason: 'user_not_found' },
    });
    return next(new ApiError(401, 'Invalid email or password'));
  }

  // 2. Check if account is locked
  if (user.isLocked()) {
    const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000));
    return next(
      new ApiError(
        423,
        `Account is temporarily locked due to multiple failed login attempts. Please try again in ${remainingMinutes} minute(s).`
      )
    );
  }

  // 3. Verify password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;

    // Lock after 5 consecutive failures
    if (user.failedLoginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 15 * 60 * 1000); // 15 min lock
    }

    await user.save();

    await recordAuditLog({
      userId: user._id,
      action: AUDIT_ACTIONS.LOGIN_FAILED,
      req,
      meta: { email: user.email, attempts: user.failedLoginAttempts },
    });

    return next(new ApiError(401, 'Invalid email or password'));
  }

  // 4. Check account status
  if (user.accountStatus === ACCOUNT_STATUS.BLOCKED) {
    return next(new ApiError(403, 'Your account has been blocked. Please contact MediBridge support.'));
  }

  if (user.accountStatus === ACCOUNT_STATUS.SUSPENDED) {
    return next(new ApiError(403, 'Your account is currently suspended. Please contact MediBridge support.'));
  }

  // 5. Successful login: reset lock counters and update lastLoginAt
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  user.lastLoginAt = new Date();
  await user.save();

  // 6. Generate token and set HTTP cookie
  const token = generateToken(user._id, rememberMe);
  setAuthCookie(res, token, rememberMe);

  // 7. Audit log
  await recordAuditLog({
    userId: user._id,
    action: AUDIT_ACTIONS.LOGIN_SUCCESS,
    req,
    meta: { role: user.role },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: toSafeUser(user),
        token,
      },
      'Sign in successful. Welcome back!'
    )
  );
});

/**
 * Sign out user and clear session cookie.
 *
 * @route POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  if (req.user) {
    await recordAuditLog({
      userId: req.user._id,
      action: AUDIT_ACTIONS.LOGOUT,
      req,
    });
  }

  clearAuthCookie(res);

  res.status(200).json(new ApiResponse(200, null, 'Successfully signed out'));
});

/**
 * Get currently authenticated user profile.
 *
 * @route GET /api/auth/me
 */
export const getMe = asyncHandler(async (req, res) => {
  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: toSafeUser(req.user),
      },
      'User profile loaded'
    )
  );
});

/**
 * Request password reset email.
 * ALWAYS returns identical generic success message to prevent user enumeration.
 *
 * @route POST /api/auth/forgot-password
 */
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  if (user && user.accountStatus === ACCOUNT_STATUS.ACTIVE) {
    const resetToken = user.createPasswordResetToken();
    await user.save();

    await sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      resetToken,
    });

    await recordAuditLog({
      userId: user._id,
      action: AUDIT_ACTIONS.PASSWORD_RESET_REQUESTED,
      req,
      meta: { email: user.email },
    });
  }

  // Always return the exact same generic success message
  res.status(200).json(
    new ApiResponse(
      200,
      null,
      'If an account exists with that email address, a password reset link has been sent.'
    )
  );
});

/**
 * Reset password using valid, unexpired token.
 *
 * @route POST /api/auth/reset-password/:token
 */
export const resetPassword = asyncHandler(async (req, res, next) => {
  const { token } = req.params;
  const { password } = req.body;

  // Hash incoming token with SHA-256 to compare with stored hash
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    return next(new ApiError(400, 'Password reset link is invalid or has expired. Please request a new one.'));
  }

  // Update password and clear reset tokens
  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.passwordChangedAt = new Date();
  user.failedLoginAttempts = 0;
  user.lockUntil = null;
  await user.save();

  await recordAuditLog({
    userId: user._id,
    action: AUDIT_ACTIONS.PASSWORD_RESET_DONE,
    req,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      null,
      'Your password has been successfully reset. Please sign in with your new password.'
    )
  );
});
