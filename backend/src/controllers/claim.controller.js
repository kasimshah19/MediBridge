import asyncHandler from '../middleware/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import Claim from '../models/Claim.js';
import {
  createClaim as createClaimService,
  acceptClaim as acceptClaimService,
  declineClaim as declineClaimService,
  withdrawClaim as withdrawClaimService,
  cancelClaim as cancelClaimService,
  getHandoverDetails as getHandoverDetailsService,
} from '../services/claim.service.js';
import { ROLES, CLAIM_STATUS, CLAIM_INITIATOR } from '../config/constants.js';

/**
 * Create a new claim (NGO requesting from donation, or Donor offering to NGO).
 * @route POST /api/claims
 */
export const createClaim = asyncHandler(async (req, res) => {
  const { donationId, medicineIds, organizationId, requirementId, message } = req.body;

  const claim = await createClaimService({
    user: req.user,
    donationId,
    medicineIds,
    organizationId,
    requirementId,
    message,
    req,
  });

  res.status(201).json(
    new ApiResponse(201, { claim }, 'Claim created successfully.')
  );
});

/**
 * Accept a pending claim.
 * @route POST /api/claims/:id/accept
 */
export const acceptClaim = asyncHandler(async (req, res) => {
  const { note } = req.body || {};

  const claim = await acceptClaimService({
    claimId: req.params.id,
    user: req.user,
    note,
    req,
  });

  res.status(200).json(
    new ApiResponse(200, { claim }, 'Claim accepted successfully. Handover details unlocked.')
  );
});

/**
 * Decline a pending claim.
 * @route POST /api/claims/:id/decline
 */
export const declineClaim = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const claim = await declineClaimService({
    claimId: req.params.id,
    user: req.user,
    reason,
    req,
  });

  res.status(200).json(
    new ApiResponse(200, { claim }, 'Claim declined.')
  );
});

/**
 * Withdraw a pending claim.
 * @route POST /api/claims/:id/withdraw
 */
export const withdrawClaim = asyncHandler(async (req, res) => {
  const claim = await withdrawClaimService({
    claimId: req.params.id,
    user: req.user,
    req,
  });

  res.status(200).json(
    new ApiResponse(200, { claim }, 'Claim withdrawn.')
  );
});

/**
 * Cancel an active or pending claim.
 * @route POST /api/claims/:id/cancel
 */
export const cancelClaim = asyncHandler(async (req, res) => {
  const { reason } = req.body;

  const claim = await cancelClaimService({
    claimId: req.params.id,
    user: req.user,
    reason,
    req,
  });

  res.status(200).json(
    new ApiResponse(200, { claim }, 'Claim cancelled.')
  );
});

/**
 * Get current user's claims with tabs & filters.
 * @route GET /api/claims/my
 */
export const getMyClaims = asyncHandler(async (req, res) => {
  const { tab = 'all', status, page = 1, limit = 10 } = req.query;
  const isDonor = req.user.role === ROLES.DONOR;
  const isNgo = req.user.role === ROLES.NGO;

  if (!isDonor && !isNgo) {
    throw new ApiError(403, 'Only Donors and NGOs can retrieve their claims.');
  }

  const query = {};

  if (isDonor) {
    query.donorId = req.user._id;
    if (tab === 'incoming') {
      query.initiatedBy = CLAIM_INITIATOR.NGO;
      query.status = CLAIM_STATUS.PENDING;
    } else if (tab === 'outgoing') {
      query.initiatedBy = CLAIM_INITIATOR.DONOR;
      query.status = CLAIM_STATUS.PENDING;
    } else if (tab === 'accepted') {
      query.status = CLAIM_STATUS.ACCEPTED;
    } else if (tab === 'closed') {
      query.status = {
        $in: [
          CLAIM_STATUS.DECLINED,
          CLAIM_STATUS.WITHDRAWN,
          CLAIM_STATUS.CANCELLED,
          CLAIM_STATUS.EXPIRED,
          CLAIM_STATUS.SUPERSEDED,
        ],
      };
    }
  } else if (isNgo) {
    if (!req.user.organizationId) {
      throw new ApiError(403, 'Account is not linked to an organization.');
    }
    query.organizationId = req.user.organizationId;
    if (tab === 'incoming') {
      query.initiatedBy = CLAIM_INITIATOR.DONOR;
      query.status = CLAIM_STATUS.PENDING;
    } else if (tab === 'outgoing') {
      query.initiatedBy = CLAIM_INITIATOR.NGO;
      query.status = CLAIM_STATUS.PENDING;
    } else if (tab === 'accepted') {
      query.status = CLAIM_STATUS.ACCEPTED;
    } else if (tab === 'closed') {
      query.status = {
        $in: [
          CLAIM_STATUS.DECLINED,
          CLAIM_STATUS.WITHDRAWN,
          CLAIM_STATUS.CANCELLED,
          CLAIM_STATUS.EXPIRED,
          CLAIM_STATUS.SUPERSEDED,
        ],
      };
    }
  }

  if (status && !tab) {
    query.status = status;
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = Math.min(parseInt(limit, 10) || 10, 50);
  const skip = (pageNum - 1) * limitNum;

  const [claims, total] = await Promise.all([
    Claim.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('organizationId', 'name type city state pincode')
      .populate('donationId', 'donationCode status location')
      .populate('donorId', 'name city state'),
    Claim.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        claims,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
      'My claims retrieved.'
    )
  );
});

/**
 * Get claim by ID.
 * @route GET /api/claims/:id
 */
export const getClaimById = asyncHandler(async (req, res) => {
  const claim = await Claim.findById(req.params.id)
    .populate('organizationId', 'name type city state pincode servicesOffered')
    .populate('donationId', 'donationCode status location')
    .populate('donorId', 'name city state')
    .populate('requirementId', 'medicineName quantityNeeded urgency');

  if (!claim) {
    throw new ApiError(404, 'Claim not found.');
  }

  const isAdmin = req.user.role === ROLES.ADMIN;
  const isDonor = req.user._id.equals(claim.donorId._id);
  const isNgo =
    req.user.role === ROLES.NGO &&
    req.user.organizationId &&
    req.user.organizationId.equals(claim.organizationId._id);

  if (!isAdmin && !isDonor && !isNgo) {
    throw new ApiError(403, 'You do not have permission to view this claim.');
  }

  res.status(200).json(
    new ApiResponse(200, { claim }, 'Claim details retrieved.')
  );
});

/**
 * Get mutual handover details for an accepted claim.
 * @route GET /api/claims/:id/handover-details
 */
export const getHandoverDetails = asyncHandler(async (req, res) => {
  const details = await getHandoverDetailsService({
    claimId: req.params.id,
    user: req.user,
    req,
  });

  res.status(200).json(
    new ApiResponse(200, details, 'Handover details retrieved.')
  );
});

export default {
  createClaim,
  acceptClaim,
  declineClaim,
  withdrawClaim,
  cancelClaim,
  getMyClaims,
  getClaimById,
  getHandoverDetails,
};
