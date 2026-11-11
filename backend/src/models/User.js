import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  ROLES,
  ROLES_ARRAY,
  ACCOUNT_STATUS,
  ACCOUNT_STATUS_ARRAY,
  APPROVAL_STATUS,
  APPROVAL_STATUS_ARRAY,
} from '../config/constants.js';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [60, 'Name cannot exceed 60 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid email address',
      ],
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function (val) {
          // Phone is optional for admin role; required for donor/pharmacist/ngo
          if (this.role === ROLES.ADMIN && !val) return true;
          return /^[6-9]\d{9}$/.test(val);
        },
        message: 'Phone number must be a valid 10-digit Indian mobile number',
      },
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false,
    },
    role: {
      type: String,
      enum: ROLES_ARRAY,
      default: ROLES.DONOR,
      index: true,
    },
    accountStatus: {
      type: String,
      enum: ACCOUNT_STATUS_ARRAY,
      default: ACCOUNT_STATUS.ACTIVE,
      index: true,
    },
    approvalStatus: {
      type: String,
      enum: APPROVAL_STATUS_ARRAY,
      default: function () {
        if (this.role === ROLES.DONOR || this.role === ROLES.ADMIN) {
          return APPROVAL_STATUS.NOT_REQUIRED;
        }
        return APPROVAL_STATUS.PENDING;
      },
      index: true,
    },
    approvalNote: {
      type: String,
      trim: true,
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    avatarUrl: {
      type: String,
      default: null,
    },
    city: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    pharmacistProfile: {
      licenseNumber: { type: String, trim: true },
      pharmacyName: { type: String, trim: true },
      registrationState: { type: String, trim: true },
      experienceYears: { type: Number, min: 0, default: 0 },
    },
    ngoContact: {
      organizationName: { type: String, trim: true },
      designation: { type: String, trim: true },
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Organization',
      default: null,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Compare candidate password with stored password hash.
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Check if the account is currently locked out.
 */
userSchema.methods.isLocked = function () {
  return Boolean(this.lockUntil && this.lockUntil > Date.now());
};

/**
 * Generate and hash password reset token (valid for 15 minutes).
 * Returns the unhashed token for emailing to the user.
 */
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // Expire in 15 minutes
  this.passwordResetExpires = new Date(Date.now() + 15 * 60 * 1000);

  return resetToken;
};

const User = mongoose.model('User', userSchema);

export default User;
