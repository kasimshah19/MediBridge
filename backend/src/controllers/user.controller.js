import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import AuditLog from '../models/AuditLog.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import toSafeUser from '../utils/toSafeUser.js';
import { recordAuditLog } from '../services/audit.service.js';
import asyncHandler from '../middleware/asyncHandler.js';
import { AUDIT_ACTIONS } from '../config/constants.js';

/**
 * Update authenticated user's profile details.
 * Prevents modifications to critical security fields (email, role, accountStatus, approvalStatus).
 *
 * @route PATCH /api/users/me
 */
export const updateMe = asyncHandler(async (req, res, next) => {
  const allowedUpdates = [
    'name',
    'phone',
    'city',
    'state',
    'address',
    'avatarUrl',
    'pharmacistProfile',
    'ngoContact',
  ];

  const user = req.user;

  // Apply allowed updates
  allowedUpdates.forEach((field) => {
    if (req.body[field] !== undefined) {
      if (typeof req.body[field] === 'object' && !Array.isArray(req.body[field]) && req.body[field] !== null) {
        user[field] = { ...user[field], ...req.body[field] };
      } else {
        user[field] = req.body[field];
      }
    }
  });

  await user.save();

  await recordAuditLog({
    userId: user._id,
    action: AUDIT_ACTIONS.PROFILE_UPDATED,
    req,
    meta: { updatedFields: Object.keys(req.body) },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: toSafeUser(user),
      },
      'Profile updated successfully'
    )
  );
});

/**
 * Change authenticated user's password.
 *
 * @route PATCH /api/users/me/password
 */
export const changePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  // Fetch full user with passwordHash
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user) {
    return next(new ApiError(404, 'User account not found'));
  }

  // Verify current password
  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    return next(new ApiError(400, 'Current password is incorrect'));
  }

  // Update password with 12 rounds bcrypt hash
  user.passwordHash = await bcrypt.hash(newPassword, 12);
  user.passwordChangedAt = new Date();
  await user.save();

  await recordAuditLog({
    userId: user._id,
    action: AUDIT_ACTIONS.PASSWORD_CHANGED,
    req,
  });

  res.status(200).json(
    new ApiResponse(200, null, 'Password changed successfully')
  );
});

/**
 * Retrieve the last 20 audit log entries for the authenticated user.
 *
 * @route GET /api/users/me/audit
 */
export const getMyAuditLogs = asyncHandler(async (req, res) => {
  const auditLogs = await AuditLog.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  res.status(200).json(
    new ApiResponse(
      200,
      {
        logs: auditLogs,
      },
      'Audit logs retrieved'
    )
  );
});
