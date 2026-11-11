/**
 * Application-wide enumerations and constants.
 * These values are shared across models, controllers, and validators.
 */

// User roles
export const ROLES = {
  DONOR: 'donor',
  PHARMACIST: 'pharmacist',
  NGO: 'ngo',
  ADMIN: 'admin',
};

export const ROLES_ARRAY = Object.values(ROLES);

// Account status
export const ACCOUNT_STATUS = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  BLOCKED: 'blocked',
};

export const ACCOUNT_STATUS_ARRAY = Object.values(ACCOUNT_STATUS);

// Role approval status (pharmacist/ngo)
export const APPROVAL_STATUS = {
  NOT_REQUIRED: 'not_required',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
};

export const APPROVAL_STATUS_ARRAY = Object.values(APPROVAL_STATUS);

// Organization types & verification status
export const ORG_TYPE = {
  NGO: 'ngo',
  CHARITABLE_CLINIC: 'charitable_clinic',
};

export const ORG_TYPE_ARRAY = Object.values(ORG_TYPE);

export const ORG_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

export const ORG_STATUS_ARRAY = Object.values(ORG_STATUS);

// Donation statuses
export const DONATION_STATUS = {
  SUBMITTED: 'submitted',
  SCREENING_REJECTED: 'screening_rejected',
  UNDER_VERIFICATION: 'under_verification',
  MORE_INFO_REQUIRED: 'more_info_required',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  MATCHED: 'matched',
  HANDED_OVER: 'handed_over',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

export const DONATION_STATUS_ARRAY = Object.values(DONATION_STATUS);

// Medicine statuses (inventory)
export const MEDICINE_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  RESERVED: 'reserved',
  TRANSFERRED: 'transferred',
  DISPOSED: 'disposed',
};

export const MEDICINE_STATUS_ARRAY = Object.values(MEDICINE_STATUS);

// Medicine types
export const MEDICINE_TYPE = {
  TABLET: 'tablet',
  CAPSULE: 'capsule',
  SYRUP: 'syrup',
  OINTMENT: 'ointment',
  OTHER: 'other',
};

export const MEDICINE_TYPE_ARRAY = Object.values(MEDICINE_TYPE);

// Packaging conditions (compliance check)
export const PACKAGING_CONDITION = {
  SEALED: 'sealed',
  OPENED: 'opened',
  DAMAGED: 'damaged',
};

export const PACKAGING_CONDITION_ARRAY = Object.values(PACKAGING_CONDITION);

// Priority levels
export const PRIORITY_LEVELS = {
  NORMAL: 'normal',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

export const PRIORITY_LEVELS_ARRAY = Object.values(PRIORITY_LEVELS);

// Verification decision
export const VERIFICATION_DECISION = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  MORE_INFO_REQUESTED: 'more_info_requested',
};

export const VERIFICATION_DECISION_ARRAY = Object.values(VERIFICATION_DECISION);

// Request status
export const REQUEST_STATUS = {
  OPEN: 'open',
  FULFILLED: 'fulfilled',
  CLOSED: 'closed',
};

export const REQUEST_STATUS_ARRAY = Object.values(REQUEST_STATUS);

// Transfer / chain of custody status
export const TRANSFER_STATUS = {
  SCHEDULED: 'scheduled',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
};

export const TRANSFER_STATUS_ARRAY = Object.values(TRANSFER_STATUS);

// Audit log action types
export const AUDIT_ACTIONS = {
  REGISTER: 'REGISTER',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_RESET_REQUESTED: 'PASSWORD_RESET_REQUESTED',
  PASSWORD_RESET_DONE: 'PASSWORD_RESET_DONE',
  PASSWORD_CHANGED: 'PASSWORD_CHANGED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
};

export const AUDIT_ACTIONS_ARRAY = Object.values(AUDIT_ACTIONS);
