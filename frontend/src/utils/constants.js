/**
 * Frontend constants and status dictionaries mirroring backend constants.
 */

export const ROLES = {
  DONOR: 'donor',
  PHARMACIST: 'pharmacist',
  NGO: 'ngo',
  ADMIN: 'admin',
};

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

export const STATUS_LABELS = {
  pending: { label: 'Pending Verification', color: 'warning' },
  verified: { label: 'Verified Safe', color: 'success' },
  rejected: { label: 'Rejected', color: 'danger' },
  expired: { label: 'Expired', color: 'danger' },
  matched: { label: 'Matched with NGO', color: 'info' },
  in_transit: { label: 'In Transit', color: 'info' },
  delivered: { label: 'Delivered', color: 'success' },
  disposed: { label: 'Disposed Safely', color: 'neutral' },
};

