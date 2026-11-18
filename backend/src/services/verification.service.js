import mongoose from 'mongoose';
import {
  DONATION_STATUS,
  MEDICINE_STATUS,
  VERIFICATION_DECISION,
  REJECTION_REASON_CODES,
  REJECTION_REASON_CODES_ARRAY,
  REJECTION_REASON_LABELS,
  MORE_INFO_REQUEST_TYPES_ARRAY,
  CHECKLIST_KEYS,
  REJECTION_SOURCES,
  AUDIT_ACTIONS,
  NOTIFICATION_TYPES,
  ROLES,
} from '../config/constants.js';
import env from '../config/env.js';
import ApiError from '../utils/ApiError.js';
import Donation from '../models/Donation.js';
import Medicine from '../models/Medicine.js';
import Verification from '../models/Verification.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import recordAuditLog from './audit.service.js';
import {
  sendVerificationDecisionEmail,
  sendVerificationMoreInfoEmail,
} from './email.service.js';
import {
  decorateMedicine,
  calculatePriority,
  assertNotExpired,
  getDaysLeft,
} from './expiry.service.js';
import { screenMedicine } from './screening.service.js';

/**
 * ════════════════════════════════════════════════════════════════════
 * PURE RULE FUNCTIONS (Unit-testable, independent of DB state)
 * ════════════════════════════════════════════════════════════════════
 */

/**
 * Pure status derivation for a donation based on the status of its medicine items:
 * - Any item pending -> stays 'under_verification'
 * - Else any item more_info_required -> becomes 'more_info_required'
 * - Else any item approved -> becomes 'approved'
 * - Else (all rejected / expired) -> becomes 'rejected'
 *
 * @param {Array<{ status: string }>} items
 * @returns {string} One of DONATION_STATUS
 */
export const deriveDonationStatus = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return DONATION_STATUS.REJECTED;
  }

  const statuses = items.map((item) => (typeof item === 'string' ? item : item?.status));

  if (statuses.includes(MEDICINE_STATUS.PENDING)) {
    return DONATION_STATUS.UNDER_VERIFICATION;
  }

  if (statuses.includes(MEDICINE_STATUS.MORE_INFO_REQUIRED)) {
    return DONATION_STATUS.MORE_INFO_REQUIRED;
  }

  if (statuses.includes(MEDICINE_STATUS.APPROVED)) {
    return DONATION_STATUS.APPROVED;
  }

  if (statuses.includes(MEDICINE_STATUS.RESERVED)) {
    return DONATION_STATUS.MATCHED;
  }

  return DONATION_STATUS.REJECTED;
};

/**
 * Pure validator for the 6-point verification checklist.
 * Returns true ONLY if all 6 criteria are boolean true.
 *
 * @param {Record<string, boolean>} checklist
 * @returns {boolean}
 */
export const validateChecklist = (checklist = {}) => {
  if (!checklist || typeof checklist !== 'object') return false;
  return CHECKLIST_KEYS.every((key) => checklist[key] === true);
};

/**
 * Pure decision rules validator.
 * Throws ApiError (422) if required fields or business rules are violated.
 */
export const validateDecisionInput = ({
  decision,
  checklist,
  reasonCode,
  reason,
  requestedTypes,
  question,
  currentRound = 0,
}) => {
  if (!decision || !Object.values(VERIFICATION_DECISION).includes(decision)) {
    throw new ApiError(422, 'Invalid decision value.');
  }

  if (decision === VERIFICATION_DECISION.APPROVED) {
    if (!validateChecklist(checklist)) {
      throw new ApiError(
        422,
        'All six verification checklist criteria must be verified as true before approving medicine.'
      );
    }
  } else if (decision === VERIFICATION_DECISION.REJECTED) {
    if (!reasonCode || !REJECTION_REASON_CODES_ARRAY.includes(reasonCode)) {
      throw new ApiError(422, 'A valid rejection reason code is required when rejecting medicine.');
    }
    const note = (reason || '').trim();
    if (note.length < 10 || note.length > 500) {
      throw new ApiError(
        422,
        'Rejection note must be between 10 and 500 characters explaining the clinical or quality concern.'
      );
    }
  } else if (decision === VERIFICATION_DECISION.MORE_INFO_REQUESTED) {
    if (currentRound >= 3) {
      throw new ApiError(
        422,
        'Maximum 3 clarification rounds reached for this medicine. Please approve or reject.'
      );
    }
    if (!Array.isArray(requestedTypes) || requestedTypes.length === 0) {
      throw new ApiError(422, 'At least one information request type must be selected.');
    }
    const invalidType = requestedTypes.find((t) => !MORE_INFO_REQUEST_TYPES_ARRAY.includes(t));
    if (invalidType) {
      throw new ApiError(422, `Invalid request type: ${invalidType}`);
    }
    const q = (question || '').trim();
    if (q.length < 10 || q.length > 500) {
      throw new ApiError(
        422,
        'A specific clarification question between 10 and 500 characters is required.'
      );
    }
  }
  return true;
};

/**
 * ════════════════════════════════════════════════════════════════════
 * CLAIM MANAGEMENT SERVICE METHODS (Lazy Expiry, Concurrency Safe)
 * ════════════════════════════════════════════════════════════════════
 */

/**
 * Atomically claims a donation for review or extends an active claim.
 * Lazy expiry: If a previous claim expired, the new pharmacist takes it over.
 */
export const claimDonation = async ({
  donationId,
  pharmacistId,
  ttlMinutes = env.VERIFICATION_CLAIM_TTL_MINUTES || 60,
  req = null,
}) => {
  const donation = await Donation.findById(donationId);
  if (!donation) {
    throw new ApiError(404, 'Donation not found.');
  }

  // Must be in reviewable state
  if (
    ![DONATION_STATUS.UNDER_VERIFICATION, DONATION_STATUS.MORE_INFO_REQUIRED].includes(
      donation.status
    )
  ) {
    throw new ApiError(409, `Donation is not currently in verification (status: ${donation.status}).`);
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlMinutes * 60 * 1000);
  const currentClaim = donation.review || {};

  const hasActiveClaim =
    Boolean(currentClaim.claimedBy) &&
    Boolean(currentClaim.claimExpiresAt) &&
    new Date(currentClaim.claimExpiresAt) > now;

  // Active claim held by another pharmacist -> Conflict (409)
  if (hasActiveClaim && !currentClaim.claimedBy.equals(pharmacistId)) {
    const holdingPharmacist = await User.findById(currentClaim.claimedBy).select('name firstName');
    const reviewerName =
      holdingPharmacist?.firstName || holdingPharmacist?.name?.split(' ')[0] || 'Another pharmacist';
    const minutesLeft = Math.max(
      1,
      Math.ceil((new Date(currentClaim.claimExpiresAt).getTime() - now.getTime()) / 60000)
    );

    throw new ApiError(409, `Another pharmacist (${reviewerName}) is actively reviewing this donation.`, {
      claimedByName: reviewerName,
      minutesLeft,
      claimExpiresAt: currentClaim.claimExpiresAt,
    });
  }

  const isExpiredTakeover =
    Boolean(currentClaim.claimedBy) &&
    !currentClaim.claimedBy.equals(pharmacistId) &&
    !hasActiveClaim;

  // Atomic conditional update
  const updatedDonation = await Donation.findOneAndUpdate(
    {
      _id: donationId,
      $or: [
        { 'review.claimedBy': null },
        { 'review.claimedBy': pharmacistId },
        { 'review.claimExpiresAt': { $lte: now } },
        { 'review.claimExpiresAt': null },
      ],
    },
    {
      $set: {
        'review.claimedBy': pharmacistId,
        'review.claimedAt': now,
        'review.claimExpiresAt': expiresAt,
      },
    },
    { new: true }
  ).populate('review.claimedBy', 'firstName name');

  if (!updatedDonation) {
    throw new ApiError(409, 'Another pharmacist claimed this donation just now.');
  }

  // Audit logging
  await recordAuditLog({
    userId: pharmacistId,
    action: isExpiredTakeover
      ? AUDIT_ACTIONS.VERIFICATION_CLAIM_EXPIRED_TAKEOVER
      : AUDIT_ACTIONS.VERIFICATION_CLAIMED,
    req,
    meta: {
      donationId: donation._id,
      donationCode: donation.donationCode,
      claimExpiresAt: expiresAt,
      previousClaimedBy: isExpiredTakeover ? currentClaim.claimedBy : null,
    },
  });

  return {
    donationId: updatedDonation._id,
    claimedBy: pharmacistId,
    claimedAt: now,
    claimExpiresAt: expiresAt,
    isTakeover: isExpiredTakeover,
  };
};

/**
 * Releases a verification claim. Only the holding pharmacist or an admin can release.
 */
export const releaseDonation = async ({ donationId, userId, isAdmin = false, req = null }) => {
  const donation = await Donation.findById(donationId);
  if (!donation) {
    throw new ApiError(404, 'Donation not found.');
  }

  const currentClaim = donation.review || {};
  if (!currentClaim.claimedBy) {
    return { released: true, message: 'Donation was not claimed.' };
  }

  if (!isAdmin && !currentClaim.claimedBy.equals(userId)) {
    throw new ApiError(403, 'You can only release donations that you have claimed.');
  }

  donation.review = {
    claimedBy: null,
    claimedAt: null,
    claimExpiresAt: null,
  };
  await donation.save();

  await recordAuditLog({
    userId,
    action: isAdmin
      ? AUDIT_ACTIONS.VERIFICATION_ADMIN_FORCE_RELEASE
      : AUDIT_ACTIONS.VERIFICATION_RELEASED,
    req,
    meta: {
      donationId: donation._id,
      donationCode: donation.donationCode,
      releasedClaimOf: currentClaim.claimedBy,
    },
  });

  return { released: true, message: 'Claim released successfully.' };
};

/**
 * ════════════════════════════════════════════════════════════════════
 * MEDICINE VERIFICATION DECISION (Atomic Conditional Update & Append-Only)
 * ════════════════════════════════════════════════════════════════════
 */

export const verifyMedicine = async ({
  medicineId,
  pharmacistId,
  decision,
  checklist = {},
  reasonCode = null,
  reason = null,
  requestedTypes = [],
  question = null,
  req = null,
}) => {
  const medicine = await Medicine.findById(medicineId);
  if (!medicine) {
    throw new ApiError(404, 'Medicine record not found.');
  }

  const donation = await Donation.findById(medicine.donationId);
  if (!donation) {
    throw new ApiError(404, 'Associated donation not found.');
  }

  const now = new Date();

  // 1. Check Active Claim
  const claim = donation.review || {};
  const isClaimActive =
    Boolean(claim.claimedBy) &&
    claim.claimedBy.equals(pharmacistId) &&
    Boolean(claim.claimExpiresAt) &&
    new Date(claim.claimExpiresAt) > now;

  if (!isClaimActive) {
    throw new ApiError(
      409,
      'You must hold an active claim on this donation before submitting a verification decision.'
    );
  }

  // 2. Check Item Status
  if (medicine.status !== MEDICINE_STATUS.PENDING) {
    throw new ApiError(
      409,
      `Only pending medicine items can be reviewed (current status: ${medicine.status}).`
    );
  }

  const currentRound = medicine.verificationState?.round || 0;

  // 3. Validate Inputs
  validateDecisionInput({
    decision,
    checklist,
    reasonCode,
    reason,
    requestedTypes,
    question,
    currentRound,
  });

  // 4. If approving, verify shelf life & assert not expired
  if (decision === VERIFICATION_DECISION.APPROVED) {
    assertNotExpired(medicine, now);

    // Re-run Phase 3 auto-screening rules
    const screenResult = screenMedicine(medicine, {
      now,
      minShelfLifeDays: env.MIN_REMAINING_SHELF_LIFE_DAYS || 90,
    });

    if (screenResult.status === 'rejected') {
      const messages = screenResult.reasons.map((r) => r.message).join(' ');
      throw new ApiError(
        409,
        `Cannot approve medicine: Acceptance screening rules failed. ${messages}. Please reject with an appropriate reason.`,
        { screeningReasons: screenResult.reasons }
      );
    }
  }

  const nextRound = currentRound + 1;

  // 5. Create immutable snapshot for Verification record
  const snapshot = {
    name: medicine.name,
    batchNumber: medicine.batchNumber,
    expiryDate: medicine.expiryDate,
    quantity: medicine.quantity,
    packagingCondition: medicine.packagingCondition,
  };

  // 6. Create immutable Verification document (APPEND-ONLY)
  const verification = await Verification.create({
    medicineId: medicine._id,
    donationId: donation._id,
    pharmacistId,
    decision,
    reasonCode: decision === VERIFICATION_DECISION.REJECTED ? reasonCode : null,
    reason:
      decision === VERIFICATION_DECISION.REJECTED
        ? reason.trim()
        : reason
        ? reason.trim()
        : null,
    requestedTypes: decision === VERIFICATION_DECISION.MORE_INFO_REQUESTED ? requestedTypes : [],
    question: decision === VERIFICATION_DECISION.MORE_INFO_REQUESTED ? question.trim() : null,
    checklist: {
      packagingIntact: Boolean(checklist.packagingIntact),
      batchReadable: Boolean(checklist.batchReadable),
      expiryValid: Boolean(checklist.expiryValid),
      storageReliable: Boolean(checklist.storageReliable),
      authenticityEstablished: Boolean(checklist.authenticityEstablished),
      policyEligible: Boolean(checklist.policyEligible),
    },
    snapshot,
    round: nextRound,
    verifiedAt: now,
  });

  // 7. Atomic conditional update on Medicine (optimistic lock matching version and pending status)
  const medUpdate = {
    $set: {
      'verificationState.latestVerificationId': verification._id,
      'verificationState.round': nextRound,
      version: (medicine.version || 0) + 1,
    },
    $push: {
      statusHistory: {
        status:
          decision === VERIFICATION_DECISION.APPROVED
            ? MEDICINE_STATUS.APPROVED
            : decision === VERIFICATION_DECISION.REJECTED
            ? MEDICINE_STATUS.REJECTED
            : MEDICINE_STATUS.MORE_INFO_REQUIRED,
        note:
          decision === VERIFICATION_DECISION.APPROVED
            ? 'Approved by pharmacist'
            : decision === VERIFICATION_DECISION.REJECTED
            ? `Rejected: ${REJECTION_REASON_LABELS[reasonCode] || reasonCode} - ${reason.trim()}`
            : `More information requested: ${question.trim()}`,
        at: now,
        by: pharmacistId,
      },
    },
  };

  if (decision === VERIFICATION_DECISION.APPROVED) {
    medUpdate.$set.status = MEDICINE_STATUS.APPROVED;
    medUpdate.$set.priority = calculatePriority(medicine.expiryDate, now);
    medUpdate.$set.rejectionReasonText = null;
    medUpdate.$set.rejectionSource = null;
  } else if (decision === VERIFICATION_DECISION.REJECTED) {
    medUpdate.$set.status = MEDICINE_STATUS.REJECTED;
    medUpdate.$set.rejectionSource = REJECTION_SOURCES.PHARMACIST;
    medUpdate.$set.rejectionReasonText = `${REJECTION_REASON_LABELS[reasonCode] || reasonCode}: ${reason.trim()}`;
  } else if (decision === VERIFICATION_DECISION.MORE_INFO_REQUESTED) {
    medUpdate.$set.status = MEDICINE_STATUS.MORE_INFO_REQUIRED;
    medUpdate.$set['verificationState.moreInfo'] = {
      question: question.trim(),
      requestedTypes,
      requestedAt: now,
      requestedBy: pharmacistId,
      donorResponse: null,
    };
  }

  const updatedMedicine = await Medicine.findOneAndUpdate(
    {
      _id: medicine._id,
      status: MEDICINE_STATUS.PENDING,
      version: medicine.version || 0,
    },
    medUpdate,
    { new: true }
  );

  if (!updatedMedicine) {
    // Concurrency conflict: another request decided on this medicine first
    await Verification.findByIdAndDelete(verification._id);
    throw new ApiError(
      409,
      'Conflict: This medicine item was already verified or modified by a concurrent request.'
    );
  }

  // 8. Recompute Donation Status
  const allItems = await Medicine.find({ donationId: donation._id });
  const derivedStatus = deriveDonationStatus(allItems);
  const previousDonationStatus = donation.status;
  donation.status = derivedStatus;

  if (derivedStatus === DONATION_STATUS.REJECTED) {
    donation.rejectionReason = 'All medicines were rejected during pharmacist verification';
  }

  donation.statusHistory.push({
    status: derivedStatus,
    note: `${medicine.name} ${decision.replace(/_/g, ' ')} by pharmacist`,
    at: now,
    by: pharmacistId,
  });

  // When no pending items remain in the donation, clear the review claim
  const hasRemainingPending = allItems.some((i) => i.status === MEDICINE_STATUS.PENDING);
  if (!hasRemainingPending) {
    donation.review = {
      claimedBy: null,
      claimedAt: null,
      claimExpiresAt: null,
    };
  }

  await donation.save();

  // 9. Audit Logging
  let auditAction = AUDIT_ACTIONS.VERIFICATION_APPROVED;
  if (decision === VERIFICATION_DECISION.REJECTED) {
    auditAction = AUDIT_ACTIONS.VERIFICATION_REJECTED;
  } else if (decision === VERIFICATION_DECISION.MORE_INFO_REQUESTED) {
    auditAction = AUDIT_ACTIONS.VERIFICATION_MORE_INFO_REQUESTED;
  }

  await recordAuditLog({
    userId: pharmacistId,
    action: auditAction,
    req,
    meta: {
      medicineId: medicine._id,
      medicineName: medicine.name,
      donationId: donation._id,
      donationCode: donation.donationCode,
      round: nextRound,
      decision,
    },
  });

  // 10. Donor Notification & Email
  const donor = await User.findById(donation.donorId);

  if (decision === VERIFICATION_DECISION.MORE_INFO_REQUESTED) {
    await Notification.create({
      userId: donation.donorId,
      title: 'Clarification Needed',
      message: `Pharmacist requested more information for ${medicine.name}: "${question.trim().slice(0, 80)}..."`,
      type: NOTIFICATION_TYPES.VERIFICATION_MORE_INFO,
      link: `/donor/donations/${donation._id}`,
    });

    if (donor && donor.email) {
      sendVerificationMoreInfoEmail({
        to: donor.email,
        name: donor.name || donor.firstName,
        donationCode: donation.donationCode,
        donationId: donation._id,
        medicineName: medicine.name,
        question: question.trim(),
      }).catch(() => {});
    }
  } else if (!hasRemainingPending || previousDonationStatus !== derivedStatus) {
    const approvedCount = allItems.filter((i) => i.status === MEDICINE_STATUS.APPROVED).length;
    const rejectedCount = allItems.filter((i) => i.status === MEDICINE_STATUS.REJECTED).length;

    await Notification.create({
      userId: donation.donorId,
      title: 'Donation Review Complete',
      message: `Donation ${donation.donationCode}: ${approvedCount} approved, ${rejectedCount} rejected.`,
      type:
        derivedStatus === DONATION_STATUS.APPROVED
          ? NOTIFICATION_TYPES.VERIFICATION_APPROVED
          : NOTIFICATION_TYPES.VERIFICATION_REJECTED,
      link: `/donor/donations/${donation._id}`,
    });

    if (donor && donor.email) {
      sendVerificationDecisionEmail({
        to: donor.email,
        name: donor.name || donor.firstName,
        donationCode: donation.donationCode,
        donationId: donation._id,
        approvedCount,
        rejectedCount,
      }).catch(() => {});
    }
  }

  return {
    medicine: updatedMedicine,
    verification,
    donationStatus: donation.status,
    hasRemainingPending,
  };
};

/**
 * ════════════════════════════════════════════════════════════════════
 * DONOR MORE-INFO RESPONSE FLOW
 * ════════════════════════════════════════════════════════════════════
 */

export const respondToMoreInfo = async ({
  donationId,
  itemId,
  donorId,
  message,
  storageHistory = null,
  batchNumber = null,
  req = null,
}) => {
  const donation = await Donation.findOne({ _id: donationId, donorId });
  if (!donation) {
    throw new ApiError(404, 'Donation not found.');
  }

  const medicine = await Medicine.findOne({ _id: itemId, donationId: donation._id });
  if (!medicine) {
    throw new ApiError(404, 'Medicine item not found.');
  }

  if (medicine.status !== MEDICINE_STATUS.MORE_INFO_REQUIRED) {
    throw new ApiError(
      409,
      `Item is not awaiting clarification (current status: ${medicine.status}).`
    );
  }

  const cleanMessage = (message || '').trim();
  if (cleanMessage.length < 5 || cleanMessage.length > 500) {
    throw new ApiError(422, 'Response message must be between 5 and 500 characters.');
  }

  const now = new Date();

  // Update item
  medicine.status = MEDICINE_STATUS.PENDING;
  medicine.rejectionReasonText = null;
  medicine.rejectionSource = null;

  medicine.verificationState = medicine.verificationState || {};
  medicine.verificationState.moreInfo = medicine.verificationState.moreInfo || {};
  medicine.verificationState.moreInfo.donorResponse = {
    message: cleanMessage,
    respondedAt: now,
  };

  if (batchNumber && batchNumber.trim().length >= 3) {
    medicine.batchNumber = batchNumber.toUpperCase().trim();
  }

  if (storageHistory && storageHistory.trim().length > 0) {
    medicine.storageHistory = storageHistory.trim();
  }

  medicine.statusHistory.push({
    status: MEDICINE_STATUS.PENDING,
    note: `Donor clarified: ${cleanMessage.slice(0, 100)}`,
    at: now,
    by: donorId,
  });

  medicine.version = (medicine.version || 0) + 1;
  await medicine.save();

  // Recompute donation status (becomes under_verification because this item is now pending)
  const allItems = await Medicine.find({ donationId: donation._id });
  const derivedStatus = deriveDonationStatus(allItems);
  donation.status = derivedStatus;

  donation.statusHistory.push({
    status: derivedStatus,
    note: `Donor submitted clarification for ${medicine.name}`,
    at: now,
    by: donorId,
  });

  await donation.save();

  // Audit
  await recordAuditLog({
    userId: donorId,
    action: AUDIT_ACTIONS.DONOR_MORE_INFO_RESPONDED,
    req,
    meta: {
      donationId: donation._id,
      donationCode: donation.donationCode,
      medicineId: medicine._id,
      medicineName: medicine.name,
      round: medicine.verificationState.round,
    },
  });

  // Notify the pharmacist who requested the information
  const requestedBy = medicine.verificationState.moreInfo.requestedBy;
  if (requestedBy) {
    await Notification.create({
      userId: requestedBy,
      title: 'Clarification Received',
      message: `Donor responded for ${medicine.name} (${donation.donationCode}): "${cleanMessage.slice(0, 60)}..."`,
      type: NOTIFICATION_TYPES.VERIFICATION_NEW_REQUEST,
      link: `/pharmacist/verification/${donation._id}`,
    });
  }

  return {
    donation,
    medicine,
  };
};

/**
 * ════════════════════════════════════════════════════════════════════
 * PHARMACIST WORKSPACE & QUEUE QUERIES
 * ════════════════════════════════════════════════════════════════════
 */

/**
 * Real dashboard summary for the logged-in pharmacist.
 */
export const getPharmacistSummary = async (pharmacistId) => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // 1. Awaiting Review (donations in queue unclaimed or with expired claims)
  const awaitingReviewCount = await Donation.countDocuments({
    status: DONATION_STATUS.UNDER_VERIFICATION,
    $or: [
      { 'review.claimedBy': null },
      { 'review.claimExpiresAt': { $lt: now } },
      { 'review.claimExpiresAt': null },
    ],
  });

  // 2. In Review by Me (active claim by logged-in pharmacist)
  const inReviewByMeCount = await Donation.countDocuments({
    status: DONATION_STATUS.UNDER_VERIFICATION,
    'review.claimedBy': pharmacistId,
    'review.claimExpiresAt': { $gt: now },
  });

  // 3. Awaiting Donor Info
  const awaitingDonorInfoCount = await Donation.countDocuments({
    status: DONATION_STATUS.MORE_INFO_REQUIRED,
  });

  // 4. Decisions Today (mine)
  const decidedTodayCount = await Verification.countDocuments({
    pharmacistId,
    verifiedAt: { $gte: startOfToday },
  });

  // 5. Approved by Me
  const approvedByMeCount = await Verification.countDocuments({
    pharmacistId,
    decision: VERIFICATION_DECISION.APPROVED,
  });

  // 6. Rejected by Me
  const rejectedByMeCount = await Verification.countDocuments({
    pharmacistId,
    decision: VERIFICATION_DECISION.REJECTED,
  });

  // 7. Critical / High Expiry Items in Queue (items with status pending in active donations with daysLeft <= 90)
  const pendingDonations = (await Donation.find({
    status: DONATION_STATUS.UNDER_VERIFICATION,
  }).select('_id')) || [];
  const pendingDonationIds = Array.isArray(pendingDonations) ? pendingDonations.map((d) => d._id) : [];

  const pendingMedicines = (await Medicine.find({
    donationId: { $in: pendingDonationIds },
    status: MEDICINE_STATUS.PENDING,
  }).select('expiryDate')) || [];

  let criticalExpiryInQueue = 0;
  if (Array.isArray(pendingMedicines)) {
    for (const med of pendingMedicines) {
      const daysLeft = getDaysLeft(med.expiryDate, now);
      if (daysLeft <= 90) {
        criticalExpiryInQueue++;
      }
    }
  }

  // 8. Average review time in hours over the last 30 days
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const recentVerifications = (await Verification.find({
    pharmacistId,
    verifiedAt: { $gte: thirtyDaysAgo },
  })
    .populate('donationId', 'submittedAt')
    .select('verifiedAt donationId')) || [];

  let avgReviewHoursLast30Days = null;
  const validDurations = [];

  if (Array.isArray(recentVerifications)) {
    for (const v of recentVerifications) {
      if (v.donationId && v.donationId.submittedAt && v.verifiedAt) {
        const diffMs = new Date(v.verifiedAt).getTime() - new Date(v.donationId.submittedAt).getTime();
        if (diffMs >= 0) {
          validDurations.push(diffMs / 3600000);
        }
      }
    }
  }

  if (validDurations.length > 0) {
    const sum = validDurations.reduce((acc, h) => acc + h, 0);
    avgReviewHoursLast30Days = Math.round((sum / validDurations.length) * 10) / 10;
  }

  // Active claims held by me
  const activeClaims = await Donation.find({
    status: DONATION_STATUS.UNDER_VERIFICATION,
    'review.claimedBy': pharmacistId,
    'review.claimExpiresAt': { $gt: now },
  })
    .select('donationCode review submittedAt')
    .limit(5);

  const activeClaimsFormatted = activeClaims.map((d) => ({
    donationId: d._id,
    donationCode: d.donationCode,
    claimedAt: d.review.claimedAt,
    claimExpiresAt: d.review.claimExpiresAt,
    minutesLeft: Math.max(
      1,
      Math.ceil((new Date(d.review.claimExpiresAt).getTime() - now.getTime()) / 60000)
    ),
  }));

  return {
    awaitingReview: awaitingReviewCount,
    inReviewByMe: inReviewByMeCount,
    awaitingDonorInfo: awaitingDonorInfoCount,
    decidedToday: decidedTodayCount,
    approvedByMe: approvedByMeCount,
    rejectedByMe: rejectedByMeCount,
    criticalExpiryInQueue,
    avgReviewHoursLast30Days,
    activeClaims: activeClaimsFormatted,
  };
};

/**
 * Filtered and paginated verification queue cards for pharmacists.
 * Privacy rule: NEVER returns donor phone, email, pickup address, or coordinates!
 */
export const getVerificationQueue = async ({
  tab = 'awaiting',
  priority = null,
  search = '',
  sort = 'oldest',
  page = 1,
  limit = 10,
  pharmacistId,
}) => {
  const now = new Date();
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  // Build query based on tab
  const baseQuery = {};

  if (tab === 'awaiting') {
    baseQuery.status = DONATION_STATUS.UNDER_VERIFICATION;
    baseQuery.$or = [
      { 'review.claimedBy': null },
      { 'review.claimExpiresAt': { $lt: now } },
      { 'review.claimExpiresAt': null },
    ];
  } else if (tab === 'mine') {
    baseQuery.status = DONATION_STATUS.UNDER_VERIFICATION;
    baseQuery['review.claimedBy'] = pharmacistId;
    baseQuery['review.claimExpiresAt'] = { $gt: now };
  } else if (tab === 'needs_info') {
    baseQuery.status = DONATION_STATUS.MORE_INFO_REQUIRED;
  } else if (tab === 'all') {
    baseQuery.status = {
      $in: [DONATION_STATUS.UNDER_VERIFICATION, DONATION_STATUS.MORE_INFO_REQUIRED],
    };
  }

  // Search by donationCode
  if (search && search.trim()) {
    baseQuery.donationCode = new RegExp(search.trim(), 'i');
  }

  // Count tabs for badge counts
  const [awaitingCount, mineCount, needsInfoCount, allCount] = await Promise.all([
    Donation.countDocuments({
      status: DONATION_STATUS.UNDER_VERIFICATION,
      $or: [
        { 'review.claimedBy': null },
        { 'review.claimExpiresAt': { $lt: now } },
        { 'review.claimExpiresAt': null },
      ],
    }),
    Donation.countDocuments({
      status: DONATION_STATUS.UNDER_VERIFICATION,
      'review.claimedBy': pharmacistId,
      'review.claimExpiresAt': { $gt: now },
    }),
    Donation.countDocuments({
      status: DONATION_STATUS.MORE_INFO_REQUIRED,
    }),
    Donation.countDocuments({
      status: {
        $in: [DONATION_STATUS.UNDER_VERIFICATION, DONATION_STATUS.MORE_INFO_REQUIRED],
      },
    }),
  ]);

  // Sorting
  let sortCriteria = { submittedAt: 1 }; // oldest first
  if (sort === 'newest') {
    sortCriteria = { submittedAt: -1 };
  }

  const [donations, total] = await Promise.all([
    Donation.find(baseQuery)
      .populate('donorId', 'firstName name city')
      .populate('review.claimedBy', 'firstName name')
      .populate({
        path: 'items',
        select: 'name expiryDate status priority',
      })
      .sort(sortCriteria)
      .skip(skip)
      .limit(limitNum),
    Donation.countDocuments(baseQuery),
  ]);

  // Map to privacy-safe queue card format
  const cards = donations.map((donation) => {
    const donorUser = donation.donorId || {};
    const donorFirstName =
      donorUser.firstName || (donorUser.name ? donorUser.name.split(' ')[0] : 'Donor');
    const donorCity = donation.pickupAddress?.city || donorUser.city || 'India';

    const items = donation.items || [];
    const pendingItems = items.filter((i) => i.status === MEDICINE_STATUS.PENDING);

    // Find most urgent item
    let mostUrgentItem = null;
    let minDaysLeft = Infinity;

    for (const item of pendingItems.length > 0 ? pendingItems : items) {
      const daysLeft = getDaysLeft(item.expiryDate, now);
      if (daysLeft < minDaysLeft) {
        minDaysLeft = daysLeft;
        mostUrgentItem = {
          name: item.name,
          daysLeft,
          effectivePriority: calculatePriority(item.expiryDate, now),
        };
      }
    }

    // Claim state
    const currentClaim = donation.review || {};
    const isClaimActive =
      Boolean(currentClaim.claimedBy) &&
      Boolean(currentClaim.claimExpiresAt) &&
      new Date(currentClaim.claimExpiresAt) > now;

    let claimData = null;
    if (isClaimActive) {
      const claimUser = currentClaim.claimedBy;
      const isClaimedByMe = claimUser && (claimUser._id ? claimUser._id.equals(pharmacistId) : claimUser.equals(pharmacistId));
      const claimedFirstName =
        claimUser?.firstName || (claimUser?.name ? claimUser.name.split(' ')[0] : 'Pharmacist');

      claimData = {
        claimedByMe: Boolean(isClaimedByMe),
        claimedByName: claimedFirstName,
        expiresAt: currentClaim.claimExpiresAt,
      };
    }

    // Waiting time in hours
    const submittedAt = donation.submittedAt || donation.createdAt;
    const waitingHours = submittedAt
      ? Math.max(0, Math.floor((now.getTime() - new Date(submittedAt).getTime()) / 3600000))
      : 0;

    return {
      donationId: donation._id,
      donationCode: donation.donationCode,
      submittedAt: donation.submittedAt,
      waitingHours,
      donor: {
        firstName: donorFirstName,
        city: donorCity,
      },
      itemCount: items.length,
      pendingItemCount: pendingItems.length,
      mostUrgentItem,
      claim: claimData,
      status: donation.status,
    };
  });

  // If sort is 'expiry_soonest', sort in memory by mostUrgentItem.daysLeft
  if (sort === 'expiry_soonest') {
    cards.sort((a, b) => {
      const daysA = a.mostUrgentItem ? a.mostUrgentItem.daysLeft : 9999;
      const daysB = b.mostUrgentItem ? b.mostUrgentItem.daysLeft : 9999;
      return daysA - daysB;
    });
  }

  // Filter by priority if requested
  let filteredCards = cards;
  if (priority) {
    filteredCards = cards.filter(
      (c) => c.mostUrgentItem && c.mostUrgentItem.effectivePriority === priority
    );
  }

  return {
    queue: filteredCards,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
    counts: {
      awaiting: awaitingCount,
      mine: mineCount,
      needs_info: needsInfoCount,
      all: allCount,
    },
  };
};

/**
 * Full review payload for a donation.
 * Privacy rule: NEVER includes pickup address (line1), coordinates, donor email, or donor phone!
 */
export const getVerificationDonationDetail = async ({ donationId, pharmacistId }) => {
  const now = new Date();

  const donation = await Donation.findById(donationId)
    .populate('donorId', 'firstName name city')
    .populate('review.claimedBy', 'firstName name')
    .populate({
      path: 'items',
      populate: {
        path: 'verificationState.moreInfo.requestedBy',
        select: 'firstName name pharmacyName',
      },
    });

  if (!donation) {
    throw new ApiError(404, 'Donation record not found.');
  }

  const donorUser = donation.donorId || {};
  const donorFirstName =
    donorUser.firstName || (donorUser.name ? donorUser.name.split(' ')[0] : 'Donor');
  const donorCity = donation.pickupAddress?.city || donorUser.city || 'India';

  // Claim State
  const currentClaim = donation.review || {};
  const isClaimActive =
    Boolean(currentClaim.claimedBy) &&
    Boolean(currentClaim.claimExpiresAt) &&
    new Date(currentClaim.claimExpiresAt) > now;

  let claimInfo = null;
  let isClaimedByMe = false;

  if (isClaimActive) {
    const claimUser = currentClaim.claimedBy;
    isClaimedByMe = claimUser && (claimUser._id ? claimUser._id.equals(pharmacistId) : claimUser.equals(pharmacistId));
    const claimedFirstName =
      claimUser?.firstName || (claimUser?.name ? claimUser.name.split(' ')[0] : 'Pharmacist');

    claimInfo = {
      isClaimedByMe,
      claimedByName: claimedFirstName,
      claimedAt: currentClaim.claimedAt,
      claimExpiresAt: currentClaim.claimExpiresAt,
      minutesLeft: Math.max(
        1,
        Math.ceil((new Date(currentClaim.claimExpiresAt).getTime() - now.getTime()) / 60000)
      ),
    };
  }

  // Waiting time
  const submittedAt = donation.submittedAt || donation.createdAt;
  const waitingHours = submittedAt
    ? Math.max(0, Math.floor((now.getTime() - new Date(submittedAt).getTime()) / 3600000))
    : 0;

  // Retrieve past Verification records for all items in this donation
  const itemIds = (donation.items || []).map((i) => i._id);
  const pastVerifications = await Verification.find({
    donationId: donation._id,
  })
    .populate('pharmacistId', 'firstName name pharmacyName')
    .sort({ verifiedAt: 1 });

  const verificationsByMedicine = new Map();
  for (const v of pastVerifications) {
    const medIdStr = v.medicineId.toString();
    if (!verificationsByMedicine.has(medIdStr)) {
      verificationsByMedicine.set(medIdStr, []);
    }
    const pharmUser = v.pharmacistId || {};
    const pharmFirstName =
      pharmUser.firstName || (pharmUser.name ? pharmUser.name.split(' ')[0] : 'Pharmacist');

    verificationsByMedicine.get(medIdStr).push({
      _id: v._id,
      round: v.round,
      decision: v.decision,
      reasonCode: v.reasonCode,
      reasonLabel: v.reasonCode ? REJECTION_REASON_LABELS[v.reasonCode] || v.reasonCode : null,
      reason: v.reason,
      requestedTypes: v.requestedTypes || [],
      question: v.question,
      checklist: v.checklist,
      verifiedAt: v.verifiedAt,
      pharmacist: {
        firstName: pharmFirstName,
        pharmacyName: pharmUser.pharmacyName || null,
      },
    });
  }

  // Format Items (decorate with live expiry and strip storedName from photos)
  const formattedItems = (donation.items || []).map((item) => {
    const decorated = decorateMedicine(item, now);

    // Sanitize photos: originalName, mimeType, size, uploadedAt (NO storedName!)
    const safePhotos = (item.photos || []).map((p) => ({
      _id: p._id,
      originalName: p.originalName,
      mimeType: p.mimeType,
      size: p.size,
      uploadedAt: p.uploadedAt,
    }));

    const previousVerifications = verificationsByMedicine.get(item._id.toString()) || [];

    return {
      _id: item._id,
      medicineId: item.medicineId,
      name: item.name,
      genericName: item.genericName,
      manufacturer: item.manufacturer,
      batchNumber: item.batchNumber,
      manufacturingDate: item.manufacturingDate,
      expiryDate: item.expiryDate,
      quantity: item.quantity,
      unit: item.unit,
      unitsPerPack: item.unitsPerPack,
      medicineType: item.medicineType,
      packagingCondition: item.packagingCondition,
      storageCondition: item.storageCondition,
      storageHistory: item.storageHistory,
      isPrescriptionOnly: item.isPrescriptionOnly,
      status: item.status,
      rejectionReasonText: item.rejectionReasonText,
      version: item.version,
      priority: item.priority,
      screening: item.screening,
      photos: safePhotos,
      daysLeft: decorated.daysLeft,
      isExpired: decorated.isExpired,
      effectivePriority: decorated.effectivePriority,
      expiryLabel: decorated.expiryLabel,
      verificationState: item.verificationState,
      previousVerifications,
    };
  });

  return {
    donation: {
      _id: donation._id,
      donationCode: donation.donationCode,
      status: donation.status,
      submittedAt: donation.submittedAt,
      waitingHours,
      declarations: donation.declarations,
      notes: donation.notes,
      donor: {
        firstName: donorFirstName,
        city: donorCity,
      },
      claim: claimInfo,
      isClaimedByMe,
      isReadOnly: !isClaimedByMe,
      items: formattedItems,
    },
  };
};

/**
 * Pharmacist's past decisions history.
 */
export const getPharmacistHistory = async ({
  pharmacistId,
  decision = null,
  search = '',
  from = null,
  to = null,
  page = 1,
  limit = 10,
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;

  const query = { pharmacistId };

  if (decision) {
    query.decision = decision;
  }

  if (from || to) {
    query.verifiedAt = {};
    if (from) query.verifiedAt.$gte = new Date(from);
    if (to) query.verifiedAt.$lte = new Date(to);
  }

  if (search && search.trim()) {
    query.$or = [
      { 'snapshot.name': new RegExp(search.trim(), 'i') },
      { 'snapshot.batchNumber': new RegExp(search.trim(), 'i') },
    ];
  }

  const [records, total] = await Promise.all([
    Verification.find(query)
      .populate('donationId', 'donationCode')
      .populate('medicineId', 'name batchNumber expiryDate unit quantity')
      .sort({ verifiedAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Verification.countDocuments(query),
  ]);

  const history = records.map((v) => ({
    _id: v._id,
    medicineId: v.medicineId?._id || v.medicineId,
    medicineName: v.snapshot?.name || v.medicineId?.name || 'Medicine',
    batchNumber: v.snapshot?.batchNumber || v.medicineId?.batchNumber || '—',
    donationCode: v.donationId?.donationCode || '—',
    donationId: v.donationId?._id || v.donationId,
    decision: v.decision,
    reasonCode: v.reasonCode,
    reasonLabel: v.reasonCode ? REJECTION_REASON_LABELS[v.reasonCode] || v.reasonCode : null,
    reason: v.reason,
    round: v.round,
    verifiedAt: v.verifiedAt,
  }));

  return {
    history,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * ════════════════════════════════════════════════════════════════════
 * ADMIN VERIFICATION AUDIT & MANAGEMENT
 * ════════════════════════════════════════════════════════════════════
 */

export const getAdminVerificationLog = async ({
  decision = null,
  pharmacistId = null,
  search = '',
  from = null,
  to = null,
  page = 1,
  limit = 20,
}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 20));
  const skip = (pageNum - 1) * limitNum;

  const query = {};

  if (decision) query.decision = decision;
  if (pharmacistId) query.pharmacistId = pharmacistId;

  if (from || to) {
    query.verifiedAt = {};
    if (from) query.verifiedAt.$gte = new Date(from);
    if (to) query.verifiedAt.$lte = new Date(to);
  }

  if (search && search.trim()) {
    query.$or = [
      { 'snapshot.name': new RegExp(search.trim(), 'i') },
      { 'snapshot.batchNumber': new RegExp(search.trim(), 'i') },
    ];
  }

  const [records, total] = await Promise.all([
    Verification.find(query)
      .populate('pharmacistId', 'name firstName email pharmacyName licenseNumber')
      .populate('donationId', 'donationCode')
      .sort({ verifiedAt: -1 })
      .skip(skip)
      .limit(limitNum),
    Verification.countDocuments(query),
  ]);

  const log = records.map((v) => ({
    _id: v._id,
    donationId: v.donationId?._id || v.donationId,
    donationCode: v.donationId?.donationCode || '—',
    medicineId: v.medicineId,
    medicineName: v.snapshot?.name || 'Medicine',
    batchNumber: v.snapshot?.batchNumber || '—',
    pharmacist: {
      _id: v.pharmacistId?._id,
      name: v.pharmacistId?.name || 'Pharmacist',
      email: v.pharmacistId?.email,
      pharmacyName: v.pharmacistId?.pharmacyName,
      licenseNumber: v.pharmacistId?.licenseNumber,
    },
    decision: v.decision,
    reasonCode: v.reasonCode,
    reasonLabel: v.reasonCode ? REJECTION_REASON_LABELS[v.reasonCode] || v.reasonCode : null,
    reason: v.reason,
    checklist: v.checklist,
    snapshot: v.snapshot,
    round: v.round,
    verifiedAt: v.verifiedAt,
  }));

  return {
    log,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

export const getAdminVerificationSummary = async () => {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Pending in queue
  const pendingInQueue = await Donation.countDocuments({
    status: DONATION_STATUS.UNDER_VERIFICATION,
  });

  // Oldest waiting donation
  const oldestDonation = await Donation.findOne({
    status: DONATION_STATUS.UNDER_VERIFICATION,
  })
    .sort({ submittedAt: 1 })
    .select('submittedAt');

  const oldestWaitingHours = oldestDonation && oldestDonation.submittedAt
    ? Math.max(0, Math.floor((now.getTime() - new Date(oldestDonation.submittedAt).getTime()) / 3600000))
    : 0;

  // Decisions today
  const decisionsToday = await Verification.countDocuments({
    verifiedAt: { $gte: startOfToday },
  });

  // 30-day approval rate
  const [totalDecisions30Days, approved30Days] = await Promise.all([
    Verification.countDocuments({
      verifiedAt: { $gte: thirtyDaysAgo },
      decision: { $in: [VERIFICATION_DECISION.APPROVED, VERIFICATION_DECISION.REJECTED] },
    }),
    Verification.countDocuments({
      verifiedAt: { $gte: thirtyDaysAgo },
      decision: VERIFICATION_DECISION.APPROVED,
    }),
  ]);

  const approvalRate30Days =
    totalDecisions30Days > 0
      ? Math.round((approved30Days / totalDecisions30Days) * 1000) / 10
      : 100;

  // Currently active claims in progress
  const activeClaimDonations = await Donation.find({
    status: DONATION_STATUS.UNDER_VERIFICATION,
    'review.claimedBy': { $ne: null },
    'review.claimExpiresAt': { $gt: now },
  })
    .populate('review.claimedBy', 'name firstName email pharmacyName phone')
    .select('donationCode review submittedAt');

  const activeClaims = activeClaimDonations.map((d) => ({
    donationId: d._id,
    donationCode: d.donationCode,
    submittedAt: d.submittedAt,
    claimedAt: d.review.claimedAt,
    claimExpiresAt: d.review.claimExpiresAt,
    minutesLeft: Math.max(
      1,
      Math.ceil((new Date(d.review.claimExpiresAt).getTime() - now.getTime()) / 60000)
    ),
    pharmacist: {
      _id: d.review.claimedBy?._id,
      name: d.review.claimedBy?.name || 'Pharmacist',
      email: d.review.claimedBy?.email,
      pharmacyName: d.review.claimedBy?.pharmacyName,
    },
  }));

  return {
    pendingInQueue,
    oldestWaitingHours,
    decisionsToday,
    approvalRate30Days,
    activeClaims,
  };
};

export default {
  deriveDonationStatus,
  validateChecklist,
  validateDecisionInput,
  claimDonation,
  releaseDonation,
  verifyMedicine,
  respondToMoreInfo,
  getPharmacistSummary,
  getVerificationQueue,
  getVerificationDonationDetail,
  getPharmacistHistory,
  getAdminVerificationLog,
  getAdminVerificationSummary,
};
