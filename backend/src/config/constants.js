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

// Medicine verification and lifecycle statuses
export const MEDICINE_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  MATCHED: 'matched',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  DISPOSED: 'disposed',
};

export const MEDICINE_STATUS_ARRAY = Object.values(MEDICINE_STATUS);

// Priority levels for donation requests
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

export const PRIORITY_LEVELS_ARRAY = Object.values(PRIORITY_LEVELS);

// Pharmacist verification statuses
export const VERIFICATION_STATUS = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  FLAGGED: 'flagged',
};

export const VERIFICATION_STATUS_ARRAY = Object.values(VERIFICATION_STATUS);

// Transfer / handover statuses
export const TRANSFER_STATUS = {
  SCHEDULED: 'scheduled',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  DELIVERED: 'delivered',
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
};

export const TRANSFER_STATUS_ARRAY = Object.values(TRANSFER_STATUS);

// Organization registration statuses
export const ORG_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  SUSPENDED: 'suspended',
  REJECTED: 'rejected',
};

export const ORG_STATUS_ARRAY = Object.values(ORG_STATUS);

