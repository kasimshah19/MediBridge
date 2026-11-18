import mongoose from 'mongoose';
import {
  TRANSFER_STATUS,
  TRANSFER_ITEM_STATUS,
  RECEIPT_DECISION,
  RECEIPT_REJECTION_CODES_ARRAY,
  RECEIPT_CHECKLIST_KEYS,
  CUSTODY_EVENT_TYPES,
  CLAIM_STATUS,
  MEDICINE_STATUS,
  NOTIFICATION_TYPES,
  AUDIT_ACTIONS,
  ROLES,
  REJECTION_SOURCES,
} from '../config/constants.js';
import env from '../config/env.js';
import Transfer from '../models/Transfer.js';
import Medicine from '../models/Medicine.js';
import Claim from '../models/Claim.js';
import Donation from '../models/Donation.js';
import Organization from '../models/Organization.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import ApiError from '../utils/ApiError.js';
import { generateTransferCode } from '../utils/generateId.js';
import {
  generateHandoverToken,
  hashHandoverToken,
  verifyHandoverToken,
  verifyMedicineToken,
} from './qr.service.js';
import { recordEvent } from './custody.service.js';
import { deriveDonationStatus } from './verification.service.js';
import { assertNotExpired } from './expiry.service.js';
import recordAuditLog from './audit.service.js';

/**
 * Creates a Transfer document when a Claim is accepted.
 * Records HANDOVER_SCHEDULED custody events for all reserved items.
 */
export const createTransferForClaim = async (claim, session = null) => {
  const existingTransfer = await Transfer.findOne({ claimId: claim._id }).session(session);
  if (existingTransfer) {
    return existingTransfer;
  }

  const transferCode = await generateTransferCode();
  const medicines = await Medicine.find({ _id: { $in: claim.medicineIds } }).session(session);

  const transferItems = medicines.map((med) => {
    const snap = (claim.itemsSnapshot || []).find((s) => s.medicineId.equals(med._id)) || {
      name: med.name,
      batchNumber: med.batchNumber,
      expiryDate: med.expiryDate,
      quantity: med.quantity,
      unit: med.unit,
    };

    return {
      medicineId: med._id,
      medicineCode: med.medicineId || med.name,
      snapshot: {
        name: snap.name,
        batchNumber: snap.batchNumber,
        expiryDate: snap.expiryDate,
        quantity: snap.quantity,
        unit: snap.unit,
      },
      status: TRANSFER_ITEM_STATUS.PENDING,
      receivedQuantity: null,
      receivedAt: null,
      receivedBy: null,
      checklist: {
        packagingIntact: false,
        batchMatches: false,
        expiryMatches: false,
        quantityMatches: false,
      },
      labelVerified: false,
      reasonCode: null,
      note: '',
    };
  });

  const transfer = new Transfer({
    transferCode,
    claimId: claim._id,
    donationId: claim.donationId,
    donorId: claim.donorId,
    organizationId: claim.organizationId,
    items: transferItems,
    status: TRANSFER_STATUS.SCHEDULED,
  });

  await transfer.save({ session });

  // Record custody events for each medicine
  const org = await Organization.findById(claim.organizationId).session(session);
  for (const med of medicines) {
    await recordEvent({
      medicineId: med._id,
      eventType: CUSTODY_EVENT_TYPES.HANDOVER_SCHEDULED,
      actorId: claim.respondedBy || claim.donorId,
      actorRole: ROLES.DONOR,
      data: {
        transferCode,
        claimCode: claim.claimCode,
        organizationName: org?.name || 'Organization',
      },
    });
  }

  // Send notifications
  await Notification.create(
    [
      {
        userId: claim.donorId,
        title: 'Handover Scheduled 📦',
        message: `Transfer ${transferCode} has been scheduled for claim ${claim.claimCode}. View your handover pass.`,
        type: NOTIFICATION_TYPES.HANDOVER_SCHEDULED,
        link: `/donor/handovers/${transfer._id}`,
      },
    ],
    { session }
  );

  const ngoUser = await User.findOne({
    organizationId: claim.organizationId,
    role: ROLES.NGO,
  }).session(session);

  if (ngoUser) {
    await Notification.create(
      [
        {
          userId: ngoUser._id,
          title: 'Handover Scheduled 📦',
          message: `Transfer ${transferCode} ready for physical receipt.`,
          type: NOTIFICATION_TYPES.HANDOVER_SCHEDULED,
          link: `/ngo/handovers/${transfer._id}`,
        },
      ],
      { session }
    );
  }

  await recordAuditLog({
    userId: claim.respondedBy || claim.donorId,
    action: AUDIT_ACTIONS.TRANSFER_CREATED,
    meta: {
      transferId: transfer._id,
      transferCode,
      claimId: claim._id,
      itemCount: transferItems.length,
    },
  });

  return transfer;
};

/**
 * Generates an ephemeral handover token for a transfer.
 * Only the donor of the transfer can request a token.
 */
export const generateTransferHandoverToken = async (transferId, userId) => {
  const transfer = await Transfer.findById(transferId);
  if (!transfer) {
    throw new ApiError(404, 'Transfer record not found.');
  }

  if (!transfer.donorId.equals(userId)) {
    throw new ApiError(403, 'Only the donor can generate a handover pass token.');
  }

  if (
    ![TRANSFER_STATUS.SCHEDULED, TRANSFER_STATUS.PARTIALLY_COMPLETED].includes(transfer.status)
  ) {
    throw new ApiError(
      400,
      `Cannot generate handover token for transfer with status '${transfer.status}'.`
    );
  }

  const rawToken = generateHandoverToken();
  const tokenHash = hashHandoverToken(rawToken);
  const ttlMinutes = env.HANDOVER_TOKEN_TTL_MINUTES || 15;
  const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

  transfer.handoverToken = {
    hash: tokenHash,
    issuedAt: new Date(),
    expiresAt,
    attempts: 0,
    usedAt: null,
  };

  await transfer.save();

  await recordAuditLog({
    userId,
    action: AUDIT_ACTIONS.HANDOVER_TOKEN_ISSUED,
    meta: {
      transferId: transfer._id,
      transferCode: transfer.transferCode,
      ttlMinutes,
    },
  });

  return {
    token: rawToken,
    expiresAt,
    ttlSeconds: ttlMinutes * 60,
  };
};

/**
 * Looks up and validates a transfer for receipt by an NGO using token and transferCode.
 */
export const lookupHandoverTransfer = async ({
  code,
  token,
  organizationId,
  req = null,
  userId = null,
}) => {
  if (!token || typeof token !== 'string') {
    throw new ApiError(400, 'Handover token is required.');
  }

  const normalizedToken = token.trim();

  // Find candidate transfer
  const query = {
    organizationId,
    status: { $in: [TRANSFER_STATUS.SCHEDULED, TRANSFER_STATUS.PARTIALLY_COMPLETED] },
  };

  if (code && typeof code === 'string' && code.trim()) {
    query.transferCode = code.trim().toUpperCase();
  }

  const transfers = await Transfer.find(query)
    .select('+handoverToken.hash')
    .populate('donationId', 'donationCode pickupAddress location contactPhone')
    .populate('donorId', 'name');

  if (transfers.length === 0) {
    throw new ApiError(404, 'No active handover transfer found for the provided details.');
  }

  let matchedTransfer = null;
  const maxAttempts = env.HANDOVER_TOKEN_MAX_ATTEMPTS || 5;

  for (const transfer of transfers) {
    if (!transfer.handoverToken || !transfer.handoverToken.hash) {
      continue;
    }

    if (transfer.handoverToken.attempts >= maxAttempts) {
      continue;
    }

    if (!transfer.handoverToken.expiresAt || new Date(transfer.handoverToken.expiresAt) <= new Date()) {
      continue;
    }

    const isValid = verifyHandoverToken(normalizedToken, transfer.handoverToken.hash);
    if (isValid) {
      matchedTransfer = transfer;
      break;
    }
  }

  if (!matchedTransfer) {
    // If a specific transfer code was searched, increment its attempt counter
    if (query.transferCode) {
      const specific = await Transfer.findOne({
        transferCode: query.transferCode,
        organizationId,
      }).select('+handoverToken.hash');

      if (specific && specific.handoverToken?.hash) {
        specific.handoverToken.attempts = (specific.handoverToken.attempts || 0) + 1;
        await specific.save();

        await recordAuditLog({
          userId,
          action: AUDIT_ACTIONS.HANDOVER_LOOKUP_FAILED,
          req,
          meta: {
            transferCode: query.transferCode,
            attempts: specific.handoverToken.attempts,
            reason:
              specific.handoverToken.attempts >= maxAttempts
                ? 'max_attempts_exceeded'
                : 'invalid_token',
          },
        });

        if (specific.handoverToken.attempts >= maxAttempts) {
          throw new ApiError(
            429,
            'Too many failed verification attempts. Please ask the donor to generate a new handover pass.'
          );
        }

        const remaining = maxAttempts - specific.handoverToken.attempts;
        throw new ApiError(400, `Invalid handover token. ${remaining} attempt(s) remaining.`);
      }
    }

    throw new ApiError(
      400,
      'Invalid or expired handover token. Please verify with the donor and try again.'
    );
  }

  // Clean donor name to first name + initial for privacy
  const result = matchedTransfer.toObject();
  delete result.handoverToken?.hash;
  if (result.donorId?.name) {
    const parts = result.donorId.name.trim().split(/\s+/);
    result.donor = {
      displayName: parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0],
    };
  }

  return result;
};

/**
 * Validates and finalizes receipt of items in a transfer.
 */
export const receiveTransferItems = async ({
  transferId,
  user,
  token,
  items,
  req = null,
}) => {
  const transfer = await Transfer.findById(transferId)
    .select('+handoverToken.hash')
    .populate('organizationId', 'name');

  if (!transfer) {
    throw new ApiError(404, 'Transfer not found.');
  }

  // Authorization check
  const isAdmin = user.role === ROLES.ADMIN;
  if (!isAdmin) {
    if (
      user.role !== ROLES.NGO ||
      !user.organizationId ||
      !user.organizationId.equals(transfer.organizationId._id || transfer.organizationId)
    ) {
      throw new ApiError(403, 'Only members of the receiving organization can accept items.');
    }
  }

  if (
    ![TRANSFER_STATUS.SCHEDULED, TRANSFER_STATUS.PARTIALLY_COMPLETED].includes(transfer.status)
  ) {
    throw new ApiError(400, `Cannot process handover for transfer with status '${transfer.status}'.`);
  }

  const maxAttempts = env.HANDOVER_TOKEN_MAX_ATTEMPTS || 5;
  if (transfer.handoverToken?.attempts >= maxAttempts) {
    throw new ApiError(
      429,
      'Too many failed attempts on this handover pass. Ask donor for a fresh pass.'
    );
  }

  if (
    !transfer.handoverToken?.expiresAt ||
    new Date(transfer.handoverToken.expiresAt) <= new Date()
  ) {
    throw new ApiError(400, 'Handover pass token has expired.');
  }

  const tokenMatches = verifyHandoverToken(token, transfer.handoverToken.hash);
  if (!tokenMatches) {
    transfer.handoverToken.attempts = (transfer.handoverToken.attempts || 0) + 1;
    await transfer.save();
    throw new ApiError(400, 'Invalid handover pass token.');
  }

  if (!Array.isArray(items) || items.length === 0) {
    throw new ApiError(422, 'At least one item decision must be submitted.');
  }

  const now = new Date();
  const orgName = transfer.organizationId.name || 'Verified Organization';

  for (const submission of items) {
    const {
      medicineId,
      decision,
      receivedQuantity,
      checklist,
      labelToken,
      reasonCode,
      note,
    } = submission;

    const transferItem = transfer.items.find(
      (ti) => ti.medicineId.equals(medicineId) || ti._id.equals(medicineId)
    );

    if (!transferItem) {
      throw new ApiError(400, `Item ${medicineId} does not belong to this transfer.`);
    }

    if (transferItem.status !== TRANSFER_ITEM_STATUS.PENDING) {
      // Already decided, skip or reject
      continue;
    }

    const med = await Medicine.findById(transferItem.medicineId);
    if (!med) {
      throw new ApiError(404, `Medicine record for ${transferItem.medicineCode} not found.`);
    }

    if (decision === RECEIPT_DECISION.RECEIVED) {
      // Validate checklist: all 4 must be true
      const checklistPassed = RECEIPT_CHECKLIST_KEYS.every(
        (key) => checklist && checklist[key] === true
      );
      if (!checklistPassed) {
        throw new ApiError(
          422,
          `All 4 verification checklist points must be verified to accept '${transferItem.snapshot.name}'.`
        );
      }

      const qty = parseInt(receivedQuantity, 10);
      if (isNaN(qty) || qty <= 0 || qty > transferItem.snapshot.quantity) {
        throw new ApiError(
          422,
          `Invalid received quantity for '${transferItem.snapshot.name}'. Must be between 1 and ${transferItem.snapshot.quantity}.`
        );
      }

      // Check shelf life not expired at receipt
      assertNotExpired(med.expiryDate);

      // Verify label token if provided
      let labelVerified = false;
      if (labelToken && typeof labelToken === 'string') {
        labelVerified = verifyMedicineToken(
          labelToken,
          med.medicineId,
          med.qr?.issuedAt || null
        );
      }

      transferItem.status = TRANSFER_ITEM_STATUS.RECEIVED;
      transferItem.receivedQuantity = qty;
      transferItem.receivedAt = now;
      transferItem.receivedBy = user._id;
      transferItem.checklist = {
        packagingIntact: true,
        batchMatches: true,
        expiryMatches: true,
        quantityMatches: true,
      };
      transferItem.labelVerified = labelVerified;
      transferItem.reasonCode = null;
      transferItem.note = (note || '').trim();

      // Update Medicine status
      med.status = MEDICINE_STATUS.TRANSFERRED;
      med.currentHolder = {
        type: 'organization',
        id: transfer.organizationId._id || transfer.organizationId,
        name: orgName,
      };
      med.statusHistory.push({
        status: MEDICINE_STATUS.TRANSFERRED,
        note: `Handed over to ${orgName} via transfer ${transfer.transferCode}`,
        at: now,
        by: user._id,
      });
      await med.save();

      // Record Custody Event
      await recordEvent({
        medicineId: med._id,
        eventType: CUSTODY_EVENT_TYPES.HANDOVER_RECEIVED,
        actorId: user._id,
        actorRole: user.role,
        data: {
          transferCode: transfer.transferCode,
          receivedQuantity: qty,
          unit: transferItem.snapshot.unit,
          labelVerified,
          organizationName: orgName,
        },
      });
    } else if (decision === RECEIPT_DECISION.REJECTED) {
      if (!reasonCode || !RECEIPT_REJECTION_CODES_ARRAY.includes(reasonCode)) {
        throw new ApiError(
          422,
          `Valid rejection reasonCode is required when rejecting '${transferItem.snapshot.name}'.`
        );
      }

      transferItem.status = TRANSFER_ITEM_STATUS.REJECTED;
      transferItem.receivedQuantity = null;
      transferItem.receivedAt = now;
      transferItem.receivedBy = user._id;
      transferItem.reasonCode = reasonCode;
      transferItem.note = (note || '').trim();

      // Update Medicine status
      med.status = MEDICINE_STATUS.REJECTED;
      med.rejectionSource = REJECTION_SOURCES.RECEIVING_ORG;
      med.rejectionReason = note || reasonCode;
      med.statusHistory.push({
        status: MEDICINE_STATUS.REJECTED,
        note: `Rejected at receipt by ${orgName}: ${reasonCode} - ${note || ''}`,
        at: now,
        by: user._id,
      });
      await med.save();

      // Record Custody Event
      await recordEvent({
        medicineId: med._id,
        eventType: CUSTODY_EVENT_TYPES.HANDOVER_REJECTED_AT_RECEIPT,
        actorId: user._id,
        actorRole: user.role,
        data: {
          transferCode: transfer.transferCode,
          reasonCode,
          note: (note || '').trim(),
          organizationName: orgName,
        },
      });
    }
  }

  // Invalidate token after use
  transfer.handoverToken.usedAt = now;
  transfer.handoverToken.expiresAt = now;

  // Determine overall transfer status
  const pendingItems = transfer.items.filter(
    (ti) => ti.status === TRANSFER_ITEM_STATUS.PENDING
  );
  const receivedItems = transfer.items.filter(
    (ti) => ti.status === TRANSFER_ITEM_STATUS.RECEIVED
  );

  if (pendingItems.length === 0) {
    transfer.status = TRANSFER_STATUS.COMPLETED;
    transfer.completedAt = now;
  } else if (receivedItems.length > 0) {
    transfer.status = TRANSFER_STATUS.PARTIALLY_COMPLETED;
  }

  await transfer.save();

  // If transfer completed, update Claim
  if (transfer.status === TRANSFER_STATUS.COMPLETED) {
    const claim = await Claim.findById(transfer.claimId);
    if (claim) {
      claim.status = CLAIM_STATUS.COMPLETED;
      claim.statusHistory.push({
        status: CLAIM_STATUS.COMPLETED,
        note: `Transfer ${transfer.transferCode} completed`,
        at: now,
        by: user._id,
      });
      await claim.save();
    }
  }

  // Update Donation Status
  const allDonationMeds = await Medicine.find({ donationId: transfer.donationId });
  const derivedStatus = deriveDonationStatus(allDonationMeds.map((m) => m.status));
  const donation = await Donation.findById(transfer.donationId);
  if (donation) {
    donation.status = derivedStatus;
    donation.statusHistory.push({
      status: derivedStatus,
      note: `Transfer ${transfer.transferCode} receipt processed (${transfer.status})`,
      at: now,
      by: user._id,
    });
    await donation.save();
  }

  // Notifications
  await Notification.create({
    userId: transfer.donorId,
    title: 'Handover Completed 🎉',
    message: `Transfer ${transfer.transferCode} has been finalized by ${orgName}. Your receipt is ready.`,
    type: NOTIFICATION_TYPES.HANDOVER_COMPLETED,
    link: `/donor/handovers/${transfer._id}`,
  });

  await recordAuditLog({
    userId: user._id,
    action: AUDIT_ACTIONS.HANDOVER_COMPLETED,
    req,
    meta: {
      transferId: transfer._id,
      transferCode: transfer.transferCode,
      status: transfer.status,
      receivedCount: receivedItems.length,
    },
  });

  return transfer;
};

/**
 * Cancels a transfer associated with a claim cancellation.
 * Throws 409 if any item has already been received.
 */
export const cancelTransferForClaim = async ({
  claimId,
  user,
  reason,
  req = null,
}) => {
  const transfer = await Transfer.findOne({ claimId });
  if (!transfer) return null;

  const hasReceivedItem = transfer.items.some(
    (item) => item.status === TRANSFER_ITEM_STATUS.RECEIVED
  );

  if (hasReceivedItem) {
    throw new ApiError(
      409,
      'Cannot cancel match: one or more medicines have already been handed over and received by the organization.'
    );
  }

  const now = new Date();
  transfer.status = TRANSFER_STATUS.CANCELLED;
  transfer.cancelledAt = now;
  transfer.cancelledBy = user._id;
  transfer.cancelReason = reason;

  for (const item of transfer.items) {
    if (item.status === TRANSFER_ITEM_STATUS.PENDING) {
      item.status = TRANSFER_ITEM_STATUS.CANCELLED;
      await recordEvent({
        medicineId: item.medicineId,
        eventType: CUSTODY_EVENT_TYPES.MATCH_CANCELLED,
        actorId: user._id,
        actorRole: user.role,
        data: {
          transferCode: transfer.transferCode,
          reason,
        },
      });
    }
  }

  await transfer.save();

  await recordAuditLog({
    userId: user._id,
    action: AUDIT_ACTIONS.TRANSFER_CANCELLED,
    req,
    meta: {
      transferId: transfer._id,
      transferCode: transfer.transferCode,
      reason,
    },
  });

  return transfer;
};
