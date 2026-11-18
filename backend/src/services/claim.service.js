import mongoose from 'mongoose';
import ApiError from '../utils/ApiError.js';
import Claim from '../models/Claim.js';
import Donation from '../models/Donation.js';
import Medicine from '../models/Medicine.js';
import Organization from '../models/Organization.js';
import Request from '../models/Request.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import {
  CLAIM_STATUS,
  CLAIM_INITIATOR,
  MEDICINE_STATUS,
  DONATION_STATUS,
  REQUEST_STATUS,
  ORG_STATUS,
  ROLES,
  AUDIT_ACTIONS,
  NOTIFICATION_TYPES,
  MAX_RADIUS_KM,
  MAX_PENDING_CLAIMS_PER_ORG,
  CLAIM_RESPONSE_TTL_HOURS,
  CUSTODY_EVENT_TYPES,
} from '../config/constants.js';
import { generateClaimCode } from '../utils/generateId.js';
import { haversineKm } from '../utils/geo.js';
import { recordAuditLog } from './audit.service.js';
import { deriveDonationStatus } from './verification.service.js';
import { recordEvent } from './custody.service.js';
import { createTransferForClaim, cancelTransferForClaim } from './transfer.service.js';

/**
 * Creates a new Claim (initiated by either an NGO or a Donor).
 */
export const createClaim = async ({
  user,
  donationId,
  medicineIds,
  organizationId = null,
  requirementId = null,
  message = '',
  req = null,
}) => {
  // 1. Fetch donation and verify existence
  const donation = await Donation.findById(donationId);
  if (!donation) {
    throw new ApiError(404, 'Donation not found.');
  }

  if (
    [DONATION_STATUS.DRAFT, DONATION_STATUS.REJECTED, DONATION_STATUS.CANCELLED].includes(
      donation.status
    )
  ) {
    throw new ApiError(400, `Cannot create a claim on a donation with status '${donation.status}'.`);
  }

  // 2. Identify initiator role and target organization
  let initiatedBy;
  let targetOrgId;

  if (user.role === ROLES.NGO) {
    initiatedBy = CLAIM_INITIATOR.NGO;
    if (!user.organizationId) {
      throw new ApiError(403, 'User is not linked to any organization.');
    }
    targetOrgId = user.organizationId;

    // Check NGO pending claims limit
    const pendingCount = await Claim.countDocuments({
      organizationId: targetOrgId,
      status: CLAIM_STATUS.PENDING,
    });
    if (pendingCount >= MAX_PENDING_CLAIMS_PER_ORG) {
      throw new ApiError(
        400,
        `Your organization already has ${pendingCount} pending claims. Maximum allowed is ${MAX_PENDING_CLAIMS_PER_ORG}.`
      );
    }
  } else if (user.role === ROLES.DONOR) {
    initiatedBy = CLAIM_INITIATOR.DONOR;
    if (!donation.donorId.equals(user._id)) {
      throw new ApiError(403, 'You can only offer your own donations.');
    }
    if (!organizationId) {
      throw new ApiError(400, 'Target organizationId is required when initiating an offer.');
    }
    targetOrgId = organizationId;
  } else {
    throw new ApiError(403, 'Only NGOs and Donors can initiate claims.');
  }

  // 3. Fetch Organization and verify
  const org = await Organization.findById(targetOrgId);
  if (!org) {
    throw new ApiError(404, 'Target organization not found.');
  }
  if (org.verificationStatus !== ORG_STATUS.VERIFIED) {
    throw new ApiError(400, 'Organization must be verified before participating in claims.');
  }

  // 4. Calculate Distance and verify within MAX_RADIUS_KM
  const distanceKm = haversineKm(donation.location, org.location);
  if (distanceKm > MAX_RADIUS_KM) {
    throw new ApiError(
      400,
      `Distance between donation and organization is ${distanceKm} km, which exceeds the maximum limit of ${MAX_RADIUS_KM} km.`
    );
  }

  // 5. Check duplicate active claims between org & donation
  const activeClaim = await Claim.findOne({
    organizationId: org._id,
    donationId: donation._id,
    status: { $in: [CLAIM_STATUS.PENDING, CLAIM_STATUS.ACCEPTED] },
  });
  if (activeClaim) {
    throw new ApiError(
      409,
      `An active claim (${activeClaim.claimCode}) already exists between this organization and donation.`
    );
  }

  // 6. Check decline cooldown (24 hours)
  const recentDecline = await Claim.findOne({
    organizationId: org._id,
    donationId: donation._id,
    status: CLAIM_STATUS.DECLINED,
    respondedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
  });
  if (recentDecline) {
    throw new ApiError(
      400,
      'A previous claim on this donation was declined recently. Please wait 24 hours before submitting a new claim.'
    );
  }

  // 7. Validate medicine items
  const meds = await Medicine.find({
    _id: { $in: medicineIds },
    donationId: donation._id,
  });

  if (meds.length !== medicineIds.length) {
    throw new ApiError(400, 'One or more selected medicines do not belong to this donation.');
  }

  const now = new Date();
  for (const med of meds) {
    if (med.status !== MEDICINE_STATUS.APPROVED) {
      throw new ApiError(
        400,
        `Medicine '${med.name}' is not approved for matching (current status: ${med.status}).`
      );
    }
    if (med.reservation?.claimId) {
      throw new ApiError(400, `Medicine '${med.name}' is already reserved for another claim.`);
    }
    if (new Date(med.expiryDate) <= now) {
      throw new ApiError(400, `Medicine '${med.name}' has expired and cannot be claimed.`);
    }
  }

  // 8. Snapshot items
  const itemsSnapshot = meds.map((m) => ({
    medicineId: m._id,
    name: m.name,
    batchNumber: m.batchNumber,
    expiryDate: m.expiryDate,
    quantity: m.quantity,
    unit: m.unit,
  }));

  // 9. Generate Claim Code and Expiry Date
  const claimCode = await generateClaimCode();
  const expiresAt = new Date(Date.now() + CLAIM_RESPONSE_TTL_HOURS * 60 * 60 * 1000);

  // 10. Create Claim
  const claim = await Claim.create({
    claimCode,
    donationId: donation._id,
    organizationId: org._id,
    donorId: donation.donorId,
    medicineIds,
    itemsSnapshot,
    initiatedBy,
    initiatedByUserId: user._id,
    requirementId: requirementId || null,
    message,
    status: CLAIM_STATUS.PENDING,
    statusHistory: [
      {
        status: CLAIM_STATUS.PENDING,
        note:
          initiatedBy === CLAIM_INITIATOR.NGO
            ? `Requested by NGO ${org.name}`
            : 'Offered by donor',
        at: new Date(),
        by: user._id,
      },
    ],
    expiresAt,
    distanceKm,
  });

  // 11. Send Notifications
  if (initiatedBy === CLAIM_INITIATOR.NGO) {
    // Notify Donor
    await Notification.create({
      userId: donation.donorId,
      title: 'New Medicine Request Received',
      message: `${org.name} has requested medicines from your donation ${donation.donationCode}.`,
      type: NOTIFICATION_TYPES.MATCH_REQUEST_RECEIVED,
      link: '/donor/matches',
    });
  } else {
    // Notify NGO primary user / organization contact
    const orgUser = await User.findOne({ organizationId: org._id, role: ROLES.NGO });
    if (orgUser) {
      await Notification.create({
        userId: orgUser._id,
        title: 'New Medicine Offer Received',
        message: `A donor has offered medicines for your organization (Donation ${donation.donationCode}).`,
        type: NOTIFICATION_TYPES.MATCH_OFFER_RECEIVED,
        link: '/ngo/matches',
      });
    }
  }

  // 12. Record Audit Log
  await recordAuditLog({
    userId: user._id,
    action: AUDIT_ACTIONS.CLAIM_CREATED,
    req,
    meta: {
      claimId: claim._id,
      claimCode,
      donationId: donation._id,
      organizationId: org._id,
      initiatedBy,
    },
  });

  return claim;
};

/**
 * Accepts a pending claim. Atomically reserves medicine items and supersedes any conflicting claims.
 */
export const acceptClaim = async ({ claimId, user, note = '', req = null }) => {
  const claim = await Claim.findById(claimId);
  if (!claim) {
    throw new ApiError(404, 'Claim not found.');
  }

  if (claim.status !== CLAIM_STATUS.PENDING) {
    throw new ApiError(400, `Cannot accept claim with status '${claim.status}'.`);
  }

  // Check TTL expiry
  if (new Date(claim.expiresAt) <= new Date()) {
    claim.status = CLAIM_STATUS.EXPIRED;
    claim.statusHistory.push({
      status: CLAIM_STATUS.EXPIRED,
      note: 'Response window expired before acceptance',
      at: new Date(),
    });
    await claim.save();
    throw new ApiError(400, 'This claim has expired and can no longer be accepted.');
  }

  // Authorize responder
  const isAdmin = user.role === ROLES.ADMIN;
  if (!isAdmin) {
    if (claim.initiatedBy === CLAIM_INITIATOR.NGO) {
      // Must be donor
      if (!user._id.equals(claim.donorId)) {
        throw new ApiError(403, 'Only the donor can accept this NGO request.');
      }
    } else {
      // Must be NGO
      if (
        user.role !== ROLES.NGO ||
        !user.organizationId ||
        !user.organizationId.equals(claim.organizationId)
      ) {
        throw new ApiError(403, 'Only the targeted NGO organization can accept this donor offer.');
      }
    }
  }

  // Atomic reservation of all medicines in claim
  const reservedMeds = [];
  const now = new Date();

  for (const medId of claim.medicineIds) {
    const updated = await Medicine.findOneAndUpdate(
      {
        _id: medId,
        donationId: claim.donationId,
        status: MEDICINE_STATUS.APPROVED,
        reservation: null,
        expiryDate: { $gt: now },
      },
      {
        $set: {
          status: MEDICINE_STATUS.RESERVED,
          reservation: {
            claimId: claim._id,
            organizationId: claim.organizationId,
            reservedAt: now,
          },
        },
      },
      { new: true }
    );

    if (!updated) {
      // Roll back previously reserved items in this transaction
      if (reservedMeds.length > 0) {
        await Medicine.updateMany(
          { _id: { $in: reservedMeds } },
          { $set: { status: MEDICINE_STATUS.APPROVED, reservation: null } }
        );
      }
      throw new ApiError(
        409,
        'One or more medicines are no longer available, already reserved, or expired.'
      );
    }

    reservedMeds.push(medId);
  }

  // Record MATCH_ACCEPTED custody event for each reserved medicine
  for (const medId of reservedMeds) {
    await recordEvent({
      medicineId: medId,
      eventType: CUSTODY_EVENT_TYPES.MATCH_ACCEPTED,
      actorId: user._id,
      actorRole: user.role,
      data: {
        claimCode: claim.claimCode,
      },
    });
  }

  // Update claim status to accepted
  claim.status = CLAIM_STATUS.ACCEPTED;
  claim.respondedAt = now;
  claim.respondedBy = user._id;
  claim.responseNote = note;
  claim.statusHistory.push({
    status: CLAIM_STATUS.ACCEPTED,
    note: note || 'Claim accepted',
    at: now,
    by: user._id,
  });
  await claim.save();

  // Update Donation matchedOrganizationIds & derive status
  const donation = await Donation.findById(claim.donationId);
  if (donation) {
    if (!donation.matchedOrganizationIds.some((id) => id.equals(claim.organizationId))) {
      donation.matchedOrganizationIds.push(claim.organizationId);
    }
    const allMeds = await Medicine.find({ donationId: donation._id });
    donation.status = deriveDonationStatus(allMeds.map((m) => m.status));
    await donation.save();
  }

  // Auto-fulfill requirement if linked
  if (claim.requirementId) {
    const reqDoc = await Request.findById(claim.requirementId);
    if (reqDoc && reqDoc.status === REQUEST_STATUS.OPEN) {
      const claimedQty = claim.itemsSnapshot.reduce((sum, item) => sum + item.quantity, 0);
      reqDoc.fulfilledQuantity = (reqDoc.fulfilledQuantity || 0) + claimedQty;

      for (const medId of claim.medicineIds) {
        if (!reqDoc.matchedMedicineIds.some((id) => id.equals(medId))) {
          reqDoc.matchedMedicineIds.push(medId);
        }
      }

      if (reqDoc.fulfilledQuantity >= reqDoc.quantityNeeded) {
        reqDoc.status = REQUEST_STATUS.FULFILLED;
        reqDoc.statusHistory.push({
          status: REQUEST_STATUS.FULFILLED,
          note: `Fulfilled by claim ${claim.claimCode}`,
          at: now,
          by: user._id,
        });

        await Notification.create({
          userId: reqDoc.requestedBy,
          title: 'Requirement Fulfilled! 🎯',
          message: `Your requirement for ${reqDoc.medicineName} has been fulfilled by accepted claim ${claim.claimCode}.`,
          type: NOTIFICATION_TYPES.REQUIREMENT_FULFILLED,
          link: '/ngo/requirements',
        });
      }
      await reqDoc.save();
    }
  }

  // Supersede conflicting pending claims that share any reserved medicine
  const conflictingClaims = await Claim.find({
    _id: { $ne: claim._id },
    status: CLAIM_STATUS.PENDING,
    medicineIds: { $in: claim.medicineIds },
  });

  for (const cc of conflictingClaims) {
    cc.status = CLAIM_STATUS.SUPERSEDED;
    cc.statusHistory.push({
      status: CLAIM_STATUS.SUPERSEDED,
      note: `Items were accepted by claim ${claim.claimCode}`,
      at: now,
      by: user._id,
    });
    await cc.save();

    const recipientUserId =
      cc.initiatedBy === CLAIM_INITIATOR.NGO ? cc.initiatedByUserId : cc.donorId;
    await Notification.create({
      userId: recipientUserId,
      title: 'Claim Superseded',
      message: `Your claim ${cc.claimCode} has been superseded because one or more requested items were accepted by another match.`,
      type: NOTIFICATION_TYPES.MATCH_CANCELLED,
      link: cc.initiatedBy === CLAIM_INITIATOR.NGO ? '/ngo/matches' : '/donor/matches',
    });
  }

  // Notify initiator
  const targetRecipientId = user._id.equals(claim.donorId)
    ? claim.initiatedByUserId
    : claim.donorId;
  await Notification.create({
    userId: targetRecipientId,
    title: 'Match Accepted! 🎉',
    message: `Claim ${claim.claimCode} has been accepted. Handover details and contact coordinates are now unlocked.`,
    type: NOTIFICATION_TYPES.MATCH_ACCEPTED,
    link: user._id.equals(claim.donorId) ? '/ngo/matches' : '/donor/matches',
  });

  // Audit Log
  await recordAuditLog({
    userId: user._id,
    action: AUDIT_ACTIONS.CLAIM_ACCEPTED,
    req,
    meta: {
      claimId: claim._id,
      claimCode: claim.claimCode,
      donationId: claim.donationId,
      organizationId: claim.organizationId,
    },
  });

  // Automatically schedule handover transfer
  await createTransferForClaim(claim);

  return claim;
};

/**
 * Declines a pending claim.
 */
export const declineClaim = async ({ claimId, user, reason, req = null }) => {
  const claim = await Claim.findById(claimId);
  if (!claim) {
    throw new ApiError(404, 'Claim not found.');
  }

  if (claim.status !== CLAIM_STATUS.PENDING) {
    throw new ApiError(400, `Cannot decline claim with status '${claim.status}'.`);
  }

  const isAdmin = user.role === ROLES.ADMIN;
  if (!isAdmin) {
    if (claim.initiatedBy === CLAIM_INITIATOR.NGO) {
      if (!user._id.equals(claim.donorId)) {
        throw new ApiError(403, 'Only the donor can decline this NGO request.');
      }
    } else {
      if (
        user.role !== ROLES.NGO ||
        !user.organizationId ||
        !user.organizationId.equals(claim.organizationId)
      ) {
        throw new ApiError(403, 'Only the target NGO organization can decline this donor offer.');
      }
    }
  }

  const now = new Date();
  claim.status = CLAIM_STATUS.DECLINED;
  claim.respondedAt = now;
  claim.respondedBy = user._id;
  claim.responseNote = reason;
  claim.statusHistory.push({
    status: CLAIM_STATUS.DECLINED,
    note: reason,
    at: now,
    by: user._id,
  });
  await claim.save();

  // Notify initiator
  await Notification.create({
    userId: claim.initiatedByUserId,
    title: 'Claim Declined',
    message: `Claim ${claim.claimCode} was declined. Reason: "${reason}"`,
    type: NOTIFICATION_TYPES.MATCH_DECLINED,
    link: claim.initiatedBy === CLAIM_INITIATOR.NGO ? '/ngo/matches' : '/donor/matches',
  });

  // Audit Log
  await recordAuditLog({
    userId: user._id,
    action: AUDIT_ACTIONS.CLAIM_DECLINED,
    req,
    meta: {
      claimId: claim._id,
      claimCode: claim.claimCode,
      reason,
    },
  });

  return claim;
};

/**
 * Withdraws a pending claim by its initiator.
 */
export const withdrawClaim = async ({ claimId, user, req = null }) => {
  const claim = await Claim.findById(claimId);
  if (!claim) {
    throw new ApiError(404, 'Claim not found.');
  }

  if (claim.status !== CLAIM_STATUS.PENDING) {
    throw new ApiError(400, `Cannot withdraw claim with status '${claim.status}'.`);
  }

  const isAdmin = user.role === ROLES.ADMIN;
  if (!isAdmin && !user._id.equals(claim.initiatedByUserId)) {
    throw new ApiError(403, 'Only the user who initiated this claim can withdraw it.');
  }

  const now = new Date();
  claim.status = CLAIM_STATUS.WITHDRAWN;
  claim.statusHistory.push({
    status: CLAIM_STATUS.WITHDRAWN,
    note: 'Withdrawn by initiator',
    at: now,
    by: user._id,
  });
  await claim.save();

  // Audit Log
  await recordAuditLog({
    userId: user._id,
    action: AUDIT_ACTIONS.CLAIM_WITHDRAWN,
    req,
    meta: {
      claimId: claim._id,
      claimCode: claim.claimCode,
    },
  });

  return claim;
};

/**
 * Cancels an active or pending claim.
 * If accepted, frees any reserved medicines back to approved status.
 */
export const cancelClaim = async ({
  claimId,
  user,
  reason,
  req = null,
  isAdmin = false,
}) => {
  const claim = await Claim.findById(claimId);
  if (!claim) {
    throw new ApiError(404, 'Claim not found.');
  }

  if (![CLAIM_STATUS.PENDING, CLAIM_STATUS.ACCEPTED].includes(claim.status)) {
    throw new ApiError(400, `Cannot cancel claim with status '${claim.status}'.`);
  }

  if (!isAdmin) {
    const isDonor = user._id.equals(claim.donorId);
    const isNgoMember =
      user.role === ROLES.NGO &&
      user.organizationId &&
      user.organizationId.equals(claim.organizationId);

    if (!isDonor && !isNgoMember) {
      throw new ApiError(403, 'You are not authorized to cancel this claim.');
    }
  }

  const now = new Date();
  const wasAccepted = claim.status === CLAIM_STATUS.ACCEPTED;

  // If was accepted, cancel transfer (blocks with 409 if any item is already received) and unreserve medicines
  if (wasAccepted) {
    await cancelTransferForClaim({
      claimId: claim._id,
      user,
      reason,
      req,
    });

    await Medicine.updateMany(
      {
        _id: { $in: claim.medicineIds },
        'reservation.claimId': claim._id,
      },
      {
        $set: {
          status: MEDICINE_STATUS.APPROVED,
          reservation: null,
        },
      }
    );

    // Recompute donation status and matchedOrganizationIds
    const donation = await Donation.findById(claim.donationId);
    if (donation) {
      const otherAccepted = await Claim.exists({
        donationId: donation._id,
        organizationId: claim.organizationId,
        status: CLAIM_STATUS.ACCEPTED,
        _id: { $ne: claim._id },
      });
      if (!otherAccepted) {
        donation.matchedOrganizationIds = donation.matchedOrganizationIds.filter(
          (id) => !id.equals(claim.organizationId)
        );
      }
      const allMeds = await Medicine.find({ donationId: donation._id });
      donation.status = deriveDonationStatus(allMeds.map((m) => m.status));
      await donation.save();
    }
  }

  // Update claim
  claim.status = CLAIM_STATUS.CANCELLED;
  claim.cancelledBy = user._id;
  claim.cancelReason = reason;
  claim.statusHistory.push({
    status: CLAIM_STATUS.CANCELLED,
    note: `Cancelled: ${reason}`,
    at: now,
    by: user._id,
  });
  await claim.save();

  // Notify other party
  const notifyUser = user._id.equals(claim.donorId)
    ? claim.initiatedByUserId
    : claim.donorId;
  await Notification.create({
    userId: notifyUser,
    title: 'Claim Cancelled',
    message: `Claim ${claim.claimCode} was cancelled. Reason: "${reason}"`,
    type: NOTIFICATION_TYPES.MATCH_CANCELLED,
    link: user._id.equals(claim.donorId) ? '/ngo/matches' : '/donor/matches',
  });

  // Audit Log
  await recordAuditLog({
    userId: user._id,
    action: isAdmin ? AUDIT_ACTIONS.CLAIM_ADMIN_CANCELLED : AUDIT_ACTIONS.CLAIM_CANCELLED,
    req,
    meta: {
      claimId: claim._id,
      claimCode: claim.claimCode,
      reason,
      wasAccepted,
    },
  });

  return claim;
};

/**
 * Retrieves mutual handover details for an accepted claim.
 * Audits contact disclosure to satisfy tamper-evident privacy rules.
 */
export const getHandoverDetails = async ({ claimId, user, req = null }) => {
  const claim = await Claim.findById(claimId)
    .populate('donorId', 'name email phone city state')
    .populate(
      'organizationId',
      'name registrationNumber contactPerson email phone address city state pincode'
    )
    .populate('donationId', 'donationCode pickupAddress pickupTimings specialInstructions');

  if (!claim) {
    throw new ApiError(404, 'Claim not found.');
  }

  if (claim.status !== CLAIM_STATUS.ACCEPTED) {
    throw new ApiError(403, 'Handover contact details are only disclosed for accepted claims.');
  }

  const isAdmin = user.role === ROLES.ADMIN;
  const isDonor = user._id.equals(claim.donorId._id);
  const isNgoMember =
    user.role === ROLES.NGO &&
    user.organizationId &&
    user.organizationId.equals(claim.organizationId._id);

  if (!isAdmin && !isDonor && !isNgoMember) {
    throw new ApiError(403, 'You do not have permission to view handover details for this claim.');
  }

  // Record mandatory contact reveal audit log
  await recordAuditLog({
    userId: user._id,
    action: AUDIT_ACTIONS.CLAIM_CONTACT_REVEALED,
    req,
    meta: {
      claimId: claim._id,
      claimCode: claim.claimCode,
      accessedByRole: user.role,
    },
  });

  return {
    claimCode: claim.claimCode,
    status: claim.status,
    acceptedAt: claim.respondedAt,
    distanceKm: claim.distanceKm,
    items: claim.itemsSnapshot,
    donor: {
      name: claim.donorId.name,
      phone: claim.donorId.phone,
      email: claim.donorId.email,
      pickupAddress: claim.donationId?.pickupAddress,
      pickupTimings: claim.donationId?.pickupTimings || 'Flexible',
      specialInstructions: claim.donationId?.specialInstructions || '',
    },
    organization: {
      name: claim.organizationId.name,
      registrationNumber: claim.organizationId.registrationNumber,
      contactPerson: claim.organizationId.contactPerson,
      phone: claim.organizationId.phone,
      email: claim.organizationId.email,
      address: claim.organizationId.address,
      city: claim.organizationId.city,
      state: claim.organizationId.state,
      pincode: claim.organizationId.pincode,
    },
  };
};
