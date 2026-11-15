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
  DRAFT: 'draft',
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected',
};

export const ORG_STATUS_ARRAY = Object.values(ORG_STATUS);

// Organization document types
export const ORG_DOC_TYPES = {
  REGISTRATION_CERTIFICATE: 'registration_certificate',
  ID_PROOF: 'id_proof',
  TAX_EXEMPTION_12A_80G: 'tax_exemption_12a_80g',
  CLINIC_LICENSE: 'clinic_license',
  OTHER: 'other',
};

export const ORG_DOC_TYPES_ARRAY = Object.values(ORG_DOC_TYPES);

// Organization services offered
export const ORG_SERVICES = {
  GENERAL_MEDICINE: 'general_medicine',
  PEDIATRICS: 'pediatrics',
  CHRONIC_CARE: 'chronic_care',
  ELDERLY_CARE: 'elderly_care',
  MATERNAL_HEALTH: 'maternal_health',
  OTHER: 'other',
};

export const ORG_SERVICES_ARRAY = Object.values(ORG_SERVICES);

// Donation statuses
export const DONATION_STATUS = {
  DRAFT: 'draft',
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
  MORE_INFO_REQUIRED: 'more_info_required',
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
  DROPS: 'drops',
  INHALER: 'inhaler',
  POWDER: 'powder',
  INJECTION: 'injection',
  OTHER: 'other',
};

export const MEDICINE_TYPE_ARRAY = Object.values(MEDICINE_TYPE);

// Packaging conditions (compliance check)
export const PACKAGING_CONDITION = {
  SEALED: 'sealed',
  OPENED: 'opened',
  DAMAGED: 'damaged',
  LOOSE_TABLETS: 'loose_tablets',
};

export const PACKAGING_CONDITION_ARRAY = Object.values(PACKAGING_CONDITION);

// Storage conditions
export const STORAGE_CONDITION = {
  ROOM_TEMPERATURE: 'room_temperature',
  REFRIGERATED: 'refrigerated',
  UNKNOWN: 'unknown',
  EXPOSED_HEAT_OR_MOISTURE: 'exposed_heat_or_moisture',
};

export const STORAGE_CONDITION_ARRAY = Object.values(STORAGE_CONDITION);

// Medicine units
export const MEDICINE_UNIT = {
  STRIP: 'strip',
  BOTTLE: 'bottle',
  TUBE: 'tube',
  VIAL: 'vial',
  BOX: 'box',
  PACK: 'pack',
};

export const MEDICINE_UNIT_ARRAY = Object.values(MEDICINE_UNIT);

// Screening rule codes
export const SCREENING_CODES = {
  EXPIRED: 'EXPIRED',
  SHELF_LIFE_TOO_SHORT: 'SHELF_LIFE_TOO_SHORT',
  PACKAGING_NOT_SEALED: 'PACKAGING_NOT_SEALED',
  LOOSE_TABLETS: 'LOOSE_TABLETS',
  INJECTION_NOT_ACCEPTED: 'INJECTION_NOT_ACCEPTED',
  COLD_CHAIN_NOT_ACCEPTED: 'COLD_CHAIN_NOT_ACCEPTED',
  CONTROLLED_SUBSTANCE: 'CONTROLLED_SUBSTANCE',
  BAD_STORAGE: 'BAD_STORAGE',
  UNREADABLE_BATCH: 'UNREADABLE_BATCH',
  DUPLICATE_ITEM: 'DUPLICATE_ITEM',
  MISSING_PHOTO: 'MISSING_PHOTO',
};

export const SCREENING_CODES_ARRAY = Object.values(SCREENING_CODES);

// Controlled substances keywords (Schedule X / Narcotic / Psychotropic items)
export const CONTROLLED_SUBSTANCE_KEYWORDS = [
  'morphine',
  'codeine',
  'fentanyl',
  'tramadol',
  'alprazolam',
  'diazepam',
  'clonazepam',
  'zolpidem',
  'methadone',
  'buprenorphine',
  'phenobarbital',
  'lorazepam',
  'nitrazepam',
  'oxycodone',
  'tapentadol',
  'ketamine',
  'midazolam',
  'chlordiazepoxide',
  'clobazam',
  'pentazocine',
];

// Cold-chain keywords (Vaccines, insulins, biologics requiring 2-8°C)
export const COLD_CHAIN_KEYWORDS = [
  'insulin',
  'vaccine',
  'vaccin',
  'interferon',
  'heparin',
  'erythropoietin',
  'filgrastim',
  'botox',
  'somatropin',
  'adalimumab',
  'etanercept',
  'infliximab',
  'rituximab',
  'trastuzumab',
];

// Rejection sources
export const REJECTION_SOURCES = {
  AUTO_SCREENING: 'auto_screening',
  PHARMACIST: 'pharmacist',
  DONOR_CANCELLED: 'donor_cancelled',
};

export const REJECTION_SOURCES_ARRAY = Object.values(REJECTION_SOURCES);

// Priority levels
export const PRIORITY_LEVELS = {
  NORMAL: 'normal',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

export const PRIORITY_LEVELS_ARRAY = Object.values(PRIORITY_LEVELS);

// Phase 4: Expiry thresholds in days (Asia/Kolkata calendar days)
export const EXPIRY_THRESHOLDS = {
  medium: 180,
  high: 90,
  critical: 30,
};

// Days before expiry to trigger alert notifications
export const ALERT_DAYS = [90, 30, 7];

// Statuses of medicines that are actively tracked for expiry
export const TRACKED_STATUSES = [
  MEDICINE_STATUS.PENDING,
  MEDICINE_STATUS.APPROVED,
  MEDICINE_STATUS.RESERVED,
  MEDICINE_STATUS.MORE_INFO_REQUIRED,
];

// Notification types
export const NOTIFICATION_TYPES = {
  SYSTEM: 'system',
  VERIFICATION: 'verification',
  DONATION: 'donation',
  TRANSFER: 'transfer',
  ALERT: 'alert',
  EXPIRY_WARNING: 'expiry_warning',
  EXPIRY_CRITICAL: 'expiry_critical',
  EXPIRY_EXPIRED: 'expiry_expired',
  VERIFICATION_APPROVED: 'verification_approved',
  VERIFICATION_REJECTED: 'verification_rejected',
  VERIFICATION_MORE_INFO: 'verification_more_info',
  VERIFICATION_NEW_REQUEST: 'verification_new_request',
};

export const NOTIFICATION_TYPES_ARRAY = Object.values(NOTIFICATION_TYPES);

// Verification decision
export const VERIFICATION_DECISION = {
  APPROVED: 'approved',
  REJECTED: 'rejected',
  MORE_INFO_REQUESTED: 'more_info_requested',
};

export const VERIFICATION_DECISION_ARRAY = Object.values(VERIFICATION_DECISION);

// Pharmacist Rejection Reason Codes
export const REJECTION_REASON_CODES = {
  PACKAGING_COMPROMISED: 'PACKAGING_COMPROMISED',
  BATCH_UNVERIFIABLE: 'BATCH_UNVERIFIABLE',
  EXPIRY_INVALID_OR_UNREADABLE: 'EXPIRY_INVALID_OR_UNREADABLE',
  STORAGE_UNRELIABLE: 'STORAGE_UNRELIABLE',
  SUSPECTED_COUNTERFEIT_OR_TAMPERED: 'SUSPECTED_COUNTERFEIT_OR_TAMPERED',
  POLICY_INELIGIBLE: 'POLICY_INELIGIBLE',
  OTHER: 'OTHER',
};

export const REJECTION_REASON_CODES_ARRAY = Object.values(REJECTION_REASON_CODES);

export const REJECTION_REASON_LABELS = {
  [REJECTION_REASON_CODES.PACKAGING_COMPROMISED]: 'Packaging compromised or opened',
  [REJECTION_REASON_CODES.BATCH_UNVERIFIABLE]: 'Batch number unverifiable or missing',
  [REJECTION_REASON_CODES.EXPIRY_INVALID_OR_UNREADABLE]: 'Expiry date invalid or unreadable',
  [REJECTION_REASON_CODES.STORAGE_UNRELIABLE]: 'Storage history unreliable or exposed to adverse conditions',
  [REJECTION_REASON_CODES.SUSPECTED_COUNTERFEIT_OR_TAMPERED]: 'Suspected counterfeit or tampered',
  [REJECTION_REASON_CODES.POLICY_INELIGIBLE]: 'Ineligible under medicine donation policy',
  [REJECTION_REASON_CODES.OTHER]: 'Other quality or safety concern',
};

// More info request types
export const MORE_INFO_REQUEST_TYPES = {
  CLEARER_BATCH_PHOTO: 'clearer_batch_photo',
  CLEARER_EXPIRY_PHOTO: 'clearer_expiry_photo',
  PACKAGING_PHOTOS: 'packaging_photos',
  STORAGE_DETAILS: 'storage_details',
  SOURCE_DETAILS: 'source_details',
  OTHER: 'other',
};

export const MORE_INFO_REQUEST_TYPES_ARRAY = Object.values(MORE_INFO_REQUEST_TYPES);

export const MORE_INFO_REQUEST_LABELS = {
  [MORE_INFO_REQUEST_TYPES.CLEARER_BATCH_PHOTO]: 'Clearer batch number photo',
  [MORE_INFO_REQUEST_TYPES.CLEARER_EXPIRY_PHOTO]: 'Clearer expiry date photo',
  [MORE_INFO_REQUEST_TYPES.PACKAGING_PHOTOS]: 'Full packaging photos (all sides)',
  [MORE_INFO_REQUEST_TYPES.STORAGE_DETAILS]: 'Storage history / storage details',
  [MORE_INFO_REQUEST_TYPES.SOURCE_DETAILS]: 'Source / purchase details',
  [MORE_INFO_REQUEST_TYPES.OTHER]: 'Other information',
};

// 6-Point verification checklist keys
export const CHECKLIST_KEYS = [
  'packagingIntact',
  'batchReadable',
  'expiryValid',
  'storageReliable',
  'authenticityEstablished',
  'policyEligible',
];

export const CHECKLIST_DESCRIPTIONS = {
  packagingIntact: 'Packaging intact and unopened',
  batchReadable: 'Batch number readable and matches photo',
  expiryValid: 'Expiry valid and readable',
  storageReliable: 'Storage history reliable',
  authenticityEstablished: 'Source and authenticity established',
  policyEligible: 'Eligible under donation policy',
};

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
  ORG_CREATED: 'ORG_CREATED',
  ORG_UPDATED: 'ORG_UPDATED',
  ORG_DOCUMENT_UPLOADED: 'ORG_DOCUMENT_UPLOADED',
  ORG_DOCUMENT_DELETED: 'ORG_DOCUMENT_DELETED',
  ORG_SUBMITTED: 'ORG_SUBMITTED',
  ORG_VERIFIED: 'ORG_VERIFIED',
  ORG_REJECTED: 'ORG_REJECTED',
  USER_APPROVED: 'USER_APPROVED',
  USER_REJECTED: 'USER_REJECTED',
  DONATION_CREATED: 'DONATION_CREATED',
  DONATION_UPDATED: 'DONATION_UPDATED',
  DONATION_PHOTO_UPLOADED: 'DONATION_PHOTO_UPLOADED',
  DONATION_PHOTO_DELETED: 'DONATION_PHOTO_DELETED',
  DONATION_SUBMITTED: 'DONATION_SUBMITTED',
  DONATION_SCREENING_REJECTED: 'DONATION_SCREENING_REJECTED',
  DONATION_CANCELLED: 'DONATION_CANCELLED',
  DONATION_DELETED: 'DONATION_DELETED',
  EXPIRY_JOB_RUN: 'EXPIRY_JOB_RUN',
  MEDICINE_AUTO_EXPIRED: 'MEDICINE_AUTO_EXPIRED',
  DONATION_AUTO_CLOSED_EXPIRED: 'DONATION_AUTO_CLOSED_EXPIRED',
  VERIFICATION_CLAIMED: 'VERIFICATION_CLAIMED',
  VERIFICATION_RELEASED: 'VERIFICATION_RELEASED',
  VERIFICATION_CLAIM_EXPIRED_TAKEOVER: 'VERIFICATION_CLAIM_EXPIRED_TAKEOVER',
  VERIFICATION_APPROVED: 'VERIFICATION_APPROVED',
  VERIFICATION_REJECTED: 'VERIFICATION_REJECTED',
  VERIFICATION_MORE_INFO_REQUESTED: 'VERIFICATION_MORE_INFO_REQUESTED',
  DONOR_MORE_INFO_RESPONDED: 'DONOR_MORE_INFO_RESPONDED',
  VERIFICATION_ADMIN_FORCE_RELEASE: 'VERIFICATION_ADMIN_FORCE_RELEASE',
};

export const AUDIT_ACTIONS_ARRAY = Object.values(AUDIT_ACTIONS);
