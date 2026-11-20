import asyncHandler from '../middleware/asyncHandler.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Donation from '../models/Donation.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import Claim from '../models/Claim.js';
import Request from '../models/Request.js';
import Transfer from '../models/Transfer.js';
import Medicine from '../models/Medicine.js';
import CustodyEvent from '../models/CustodyEvent.js';
import Verification from '../models/Verification.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import verificationService from '../services/verification.service.js';
import { cancelClaim as cancelClaimService } from '../services/claim.service.js';
import { buildTrace, verifyChain } from '../services/custody.service.js';
import {
  sendOrgVerifiedEmail,
  sendOrgRejectedEmail,
  sendUserApprovedEmail,
  sendUserRejectedEmail,
  sendAccountStatusChangedEmail,
} from '../services/email.service.js';
import { sanitizeCsvCell } from '../services/report.service.js';
import recordAuditLog from '../services/audit.service.js';
import {
  ORG_STATUS,
  ROLES,
  APPROVAL_STATUS,
  AUDIT_ACTIONS,
  DONATION_STATUS,
  CLAIM_STATUS,
  REQUEST_STATUS,
  TRANSFER_STATUS,
  MEDICINE_STATUS,
} from '../config/constants.js';

/**
 * Get paginated list of organizations with status counts and search filter.
 * @route GET /api/admin/organizations
 */
export const getOrganizations = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const { status, type, search } = req.query;

  const query = {};

  // Status filter (exclude drafts by default from general view)
  if (status && status !== 'all') {
    query.verificationStatus = status;
  } else if (!status || status === 'all') {
    query.verificationStatus = { $ne: ORG_STATUS.DRAFT };
  }

  if (type) {
    query.type = type;
  }

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { registrationNumber: searchRegex },
      { city: searchRegex },
      { contactPerson: searchRegex },
    ];
  }

  const [organizations, total, counts] = await Promise.all([
    Organization.find(query)
      .populate('ownerId', 'name email phone avatarUrl')
      .populate('verifiedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Organization.countDocuments(query),
    (async () => {
      const [pending, verified, rejected, draft, nonDraft] = await Promise.all([
        Organization.countDocuments({ verificationStatus: ORG_STATUS.PENDING }),
        Organization.countDocuments({ verificationStatus: ORG_STATUS.VERIFIED }),
        Organization.countDocuments({ verificationStatus: ORG_STATUS.REJECTED }),
        Organization.countDocuments({ verificationStatus: ORG_STATUS.DRAFT }),
        Organization.countDocuments({ verificationStatus: { $ne: ORG_STATUS.DRAFT } }),
      ]);
      return {
        pending,
        verified,
        rejected,
        draft,
        all: nonDraft,
      };
    })(),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        organizations,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
        counts,
      },
      'Organizations retrieved successfully.'
    )
  );
});

/**
 * Get full organization details by ID.
 * @route GET /api/admin/organizations/:id
 */
export const getOrganizationById = asyncHandler(async (req, res, next) => {
  const organization = await Organization.findById(req.params.id)
    .populate('ownerId', 'name email phone avatarUrl createdAt')
    .populate('verifiedBy', 'name email')
    .populate('reviewHistory.reviewerId', 'name email');

  if (!organization) {
    return next(new ApiError(404, 'Organization not found.'));
  }

  res.status(200).json(
    new ApiResponse(200, { organization }, 'Organization retrieved successfully.')
  );
});

/**
 * Review organization verification (approve or reject with mandatory note).
 * @route PATCH /api/admin/organizations/:id/review
 */
export const reviewOrganization = asyncHandler(async (req, res, next) => {
  const { decision, note } = req.body;

  const organization = await Organization.findById(req.params.id);
  if (!organization) {
    return next(new ApiError(404, 'Organization not found.'));
  }

  if (organization.verificationStatus !== ORG_STATUS.PENDING) {
    return next(
      new ApiError(
        409,
        `Only organizations in "pending" status can be reviewed. Current status is "${organization.verificationStatus}".`
      )
    );
  }

  const owner = await User.findById(organization.ownerId);
  if (!owner) {
    return next(new ApiError(404, 'Organization owner account not found.'));
  }

  const reviewEntry = {
    decision,
    note: note || '',
    reviewerId: req.user._id,
    at: new Date(),
  };

  organization.reviewHistory.push(reviewEntry);

  if (decision === 'verified') {
    organization.verificationStatus = ORG_STATUS.VERIFIED;
    organization.verificationNote = note || null;
    organization.verifiedBy = req.user._id;
    organization.verifiedAt = new Date();

    owner.approvalStatus = APPROVAL_STATUS.APPROVED;
    owner.approvalNote = null;
    owner.approvedBy = req.user._id;
    owner.approvedAt = new Date();

    await organization.save();
    await owner.save();

    // Create in-app notification
    await Notification.create({
      userId: owner._id,
      title: 'Organization Verified',
      message: `Your organization "${organization.name}" has been verified. Welcome to MediBridge!`,
      type: 'verification',
      link: '/ngo/dashboard',
    });

    // Send email
    await sendOrgVerifiedEmail({
      to: owner.email,
      name: owner.name,
      orgName: organization.name,
    });

    await recordAuditLog({
      userId: req.user._id,
      action: AUDIT_ACTIONS.ORG_VERIFIED,
      req,
      meta: { orgId: organization._id, ownerId: owner._id, decision },
    });
  } else {
    // Decision is 'rejected'
    organization.verificationStatus = ORG_STATUS.REJECTED;
    organization.verificationNote = note;

    owner.approvalStatus = APPROVAL_STATUS.REJECTED;
    owner.approvalNote = note;

    await organization.save();
    await owner.save();

    await Notification.create({
      userId: owner._id,
      title: 'Organization Verification Update',
      message: `Your organization "${organization.name}" was not approved: ${note}`,
      type: 'verification',
      link: '/ngo/onboarding',
    });

    await sendOrgRejectedEmail({
      to: owner.email,
      name: owner.name,
      orgName: organization.name,
      note,
    });

    await recordAuditLog({
      userId: req.user._id,
      action: AUDIT_ACTIONS.ORG_REJECTED,
      req,
      meta: { orgId: organization._id, ownerId: owner._id, note },
    });
  }

  res.status(200).json(
    new ApiResponse(
      200,
      { organization },
      `Organization successfully ${decision === 'verified' ? 'verified' : 'rejected'}.`
    )
  );
});

/**
 * Get users list for admin management (especially pharmacists pending verification).
 * @route GET /api/admin/users
 */
export const getUsers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 10;
  const skip = (page - 1) * limit;

  const { role, approvalStatus, search } = req.query;

  const query = {};
  if (role) query.role = role;
  if (approvalStatus) query.approvalStatus = approvalStatus;

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
      { 'pharmacistProfile.licenseNumber': searchRegex },
      { 'pharmacistProfile.pharmacyName': searchRegex },
    ];
  }

  const [users, total, pendingPharmacists, approvedPharmacists, rejectedPharmacists] =
    await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(query),
      User.countDocuments({ role: ROLES.PHARMACIST, approvalStatus: APPROVAL_STATUS.PENDING }),
      User.countDocuments({ role: ROLES.PHARMACIST, approvalStatus: APPROVAL_STATUS.APPROVED }),
      User.countDocuments({ role: ROLES.PHARMACIST, approvalStatus: APPROVAL_STATUS.REJECTED }),
    ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
        counts: {
          pendingPharmacists,
          approvedPharmacists,
          rejectedPharmacists,
        },
      },
      'Users retrieved successfully.'
    )
  );
});

/**
 * Review user application (specifically pharmacists).
 * @route PATCH /api/admin/users/:id/review
 */
export const reviewUser = asyncHandler(async (req, res, next) => {
  const { decision, note } = req.body;

  const user = await User.findById(req.params.id);
  if (!user) {
    return next(new ApiError(404, 'User not found.'));
  }

  if (user.role !== ROLES.PHARMACIST) {
    return next(
      new ApiError(
        400,
        'Direct user review is only applicable to pharmacists. NGO approval is handled via organization review.'
      )
    );
  }

  if (decision === 'approved') {
    user.approvalStatus = APPROVAL_STATUS.APPROVED;
    user.approvalNote = note || null;
    user.approvedBy = req.user._id;
    user.approvedAt = new Date();
    await user.save();

    await Notification.create({
      userId: user._id,
      title: 'Pharmacist Account Approved',
      message: 'Your pharmacist registration has been verified and approved.',
      type: 'verification',
      link: '/pharmacist/dashboard',
    });

    await sendUserApprovedEmail({
      to: user.email,
      name: user.name,
      role: user.role,
    });

    await recordAuditLog({
      userId: req.user._id,
      action: AUDIT_ACTIONS.USER_APPROVED,
      req,
      meta: { targetUserId: user._id, role: user.role },
    });
  } else {
    // decision === 'rejected'
    user.approvalStatus = APPROVAL_STATUS.REJECTED;
    user.approvalNote = note;
    await user.save();

    await Notification.create({
      userId: user._id,
      title: 'Pharmacist Verification Update',
      message: `Your verification was not approved: ${note}`,
      type: 'verification',
      link: '/approval-pending',
    });

    await sendUserRejectedEmail({
      to: user.email,
      name: user.name,
      role: user.role,
      note,
    });

    await recordAuditLog({
      userId: req.user._id,
      action: AUDIT_ACTIONS.USER_REJECTED,
      req,
      meta: { targetUserId: user._id, role: user.role, note },
    });
  }

  res.status(200).json(
    new ApiResponse(
      200,
      { user },
      `Pharmacist ${decision === 'approved' ? 'approved' : 'rejected'} successfully.`
    )
  );
});

/**
 * Get real overview metrics for the administrator dashboard.
 * @route GET /api/admin/overview
 */
export const getOverview = asyncHandler(async (_req, res) => {
  const now = new Date();

  const [
    pendingOrganizations,
    verifiedOrganizations,
    pendingPharmacists,
    totalDonors,
    totalUsers,
    recentActivity,
    donationsAwaitingVerification,
    oldestDonation,
    donationsAwaitingMatch,
    pendingClaims,
  ] = await Promise.all([
    Organization.countDocuments({ verificationStatus: ORG_STATUS.PENDING }),
    Organization.countDocuments({ verificationStatus: ORG_STATUS.VERIFIED }),
    User.countDocuments({ role: ROLES.PHARMACIST, approvalStatus: APPROVAL_STATUS.PENDING }),
    User.countDocuments({ role: ROLES.DONOR }),
    User.countDocuments(),
    AuditLog.find()
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .limit(10),
    Donation.countDocuments({ status: DONATION_STATUS.UNDER_VERIFICATION }),
    Donation.findOne({ status: DONATION_STATUS.UNDER_VERIFICATION })
      .sort({ submittedAt: 1 })
      .select('submittedAt'),
    Donation.countDocuments({ status: DONATION_STATUS.APPROVED }),
    Claim.countDocuments({ status: CLAIM_STATUS.PENDING }),
  ]);

  const oldestWaitingHours =
    oldestDonation && oldestDonation.submittedAt
      ? Math.max(0, Math.floor((now.getTime() - new Date(oldestDonation.submittedAt).getTime()) / 3600000))
      : 0;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        pendingOrganizations,
        verifiedOrganizations,
        pendingPharmacists,
        totalDonors,
        totalUsers,
        recentActivity,
        donationsAwaitingVerification,
        oldestWaitingHours,
        donationsAwaitingMatch,
        pendingClaims,
      },
      'Admin overview retrieved successfully.'
    )
  );
});

/**
 * Force release a claimed donation.
 * @route POST /api/admin/verification/donations/:id/force-release
 */
export const forceReleaseDonation = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await verificationService.releaseDonation({
    donationId: id,
    userId: req.user._id,
    isAdmin: true,
    req,
  });

  res.status(200).json(new ApiResponse(200, result, 'Donation claim force-released by administrator.'));
});

/**
 * Filterable verification audit log for admins.
 * @route GET /api/admin/verification/log
 */
export const getVerificationLog = asyncHandler(async (req, res) => {
  const { decision, pharmacistId, search, from, to, page, limit } = req.query;
  const result = await verificationService.getAdminVerificationLog({
    decision,
    pharmacistId,
    search,
    from,
    to,
    page,
    limit,
  });

  res.status(200).json(new ApiResponse(200, result, 'Verification log retrieved successfully.'));
});

/**
 * High-level verification summary and active claims for admins.
 * @route GET /api/admin/verification/summary
 */
export const getVerificationSummary = asyncHandler(async (_req, res) => {
  const summary = await verificationService.getAdminVerificationSummary();
  res.status(200).json(new ApiResponse(200, summary, 'Verification summary retrieved successfully.'));
});

/**
 * Matching and claims overview summary for admin.
 * @route GET /api/admin/matching/summary
 */
export const getMatchingSummary = asyncHandler(async (_req, res) => {
  const [
    totalClaims,
    pendingClaims,
    acceptedClaims,
    closedClaims,
    donationsAwaitingMatch,
    openRequirements,
    distanceAgg,
  ] = await Promise.all([
    Claim.countDocuments(),
    Claim.countDocuments({ status: CLAIM_STATUS.PENDING }),
    Claim.countDocuments({ status: CLAIM_STATUS.ACCEPTED }),
    Claim.countDocuments({
      status: {
        $in: [
          CLAIM_STATUS.DECLINED,
          CLAIM_STATUS.WITHDRAWN,
          CLAIM_STATUS.CANCELLED,
          CLAIM_STATUS.EXPIRED,
          CLAIM_STATUS.SUPERSEDED,
        ],
      },
    }),
    Donation.countDocuments({ status: DONATION_STATUS.APPROVED }),
    Request.countDocuments({ status: REQUEST_STATUS.OPEN }),
    Claim.aggregate([
      { $match: { status: CLAIM_STATUS.ACCEPTED } },
      { $group: { _id: null, avgDistance: { $avg: '$distanceKm' } } },
    ]),
  ]);

  const avgDistanceKm =
    distanceAgg.length > 0 && distanceAgg[0].avgDistance
      ? Math.round(distanceAgg[0].avgDistance * 10) / 10
      : 0;

  res.status(200).json(
    new ApiResponse(
      200,
      {
        totalClaims,
        pendingClaims,
        acceptedClaims,
        closedClaims,
        donationsAwaitingMatch,
        openRequirements,
        avgDistanceKm,
      },
      'Admin matching summary retrieved.'
    )
  );
});

/**
 * Filterable claims list for admins.
 * @route GET /api/admin/claims
 */
export const getAdminClaims = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 15 } = req.query;
  const query = {};
  if (status && status !== 'all') {
    query.status = status;
  }
  if (search) {
    query.claimCode = { $regex: search, $options: 'i' };
  }

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = Math.min(parseInt(limit, 10) || 15, 50);
  const skip = (pageNum - 1) * limitNum;

  const [claims, total] = await Promise.all([
    Claim.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('organizationId', 'name city state')
      .populate('donorId', 'name city state')
      .populate('donationId', 'donationCode status'),
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
      'Admin claims list retrieved.'
    )
  );
});

/**
 * Admin force-cancellation of an active or pending claim.
 * @route POST /api/admin/claims/:id/cancel
 */
export const cancelAdminClaim = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  const claim = await cancelClaimService({
    claimId: id,
    user: req.user,
    reason,
    req,
    isAdmin: true,
  });

  res.status(200).json(
    new ApiResponse(200, { claim }, 'Claim cancelled by administrator.')
  );
});

/**
 * Requirements list for admins.
 * @route GET /api/admin/requirements
 */
export const getAdminRequirements = asyncHandler(async (req, res) => {
  const { status, urgency, search, page = 1, limit = 15 } = req.query;
  const query = {};
  if (status && status !== 'all') query.status = status;
  if (urgency && urgency !== 'all') query.urgency = urgency;
  if (search) query.medicineName = { $regex: search, $options: 'i' };

  const pageNum = parseInt(page, 10) || 1;
  const limitNum = Math.min(parseInt(limit, 10) || 15, 50);
  const skip = (pageNum - 1) * limitNum;

  const [requirements, total] = await Promise.all([
    Request.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate('organizationId', 'name city state pincode')
      .populate('requestedBy', 'name email'),
    Request.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        requirements,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
      'Admin requirements list retrieved.'
    )
  );
});

/**
 * Verified organizations map coordinates.
 * @route GET /api/admin/organizations/map
 */
export const getOrganizationsMap = asyncHandler(async (_req, res) => {
  const organizations = await Organization.find({
    verificationStatus: ORG_STATUS.VERIFIED,
  }).select('name type city state pincode location servicesOffered');

  res.status(200).json(
    new ApiResponse(200, { organizations }, 'Verified organizations map data retrieved.')
  );
});

/**
 * List all transfers for admin overview.
 * @route GET /api/admin/transfers
 */
export const getAdminTransfers = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 15, 50);
  const skip = (page - 1) * limit;
  const { status, search } = req.query;

  const query = {};

  if (status && status !== 'all') {
    query.status = status;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    const [matchingDonations, matchingOrgs, matchingUsers] = await Promise.all([
      Donation.find({ donationCode: searchRegex }).select('_id'),
      Organization.find({ name: searchRegex }).select('_id'),
      User.find({ name: searchRegex }).select('_id'),
    ]);

    query.$or = [
      { transferCode: searchRegex },
      { donationId: { $in: matchingDonations.map((d) => d._id) } },
      { organizationId: { $in: matchingOrgs.map((o) => o._id) } },
      { donorId: { $in: matchingUsers.map((u) => u._id) } },
    ];
  }

  const [transfers, total] = await Promise.all([
    Transfer.find(query)
      .populate('donationId', 'donationCode pickupAddress location')
      .populate('organizationId', 'name city state')
      .populate('donorId', 'name email phone')
      .populate('claimId', 'claimCode')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Transfer.countDocuments(query),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        transfers,
        pagination: {
          total,
          page,
          limit,
          pages: Math.ceil(total / limit),
        },
      },
      'Admin transfers retrieved successfully.'
    )
  );
});

/**
 * Get summary stats for all transfers.
 * @route GET /api/admin/transfers/summary
 */
export const getAdminTransfersSummary = asyncHandler(async (_req, res) => {
  const [
    total,
    scheduled,
    partiallyCompleted,
    completed,
    cancelled,
    medicinesTransferred,
  ] = await Promise.all([
    Transfer.countDocuments(),
    Transfer.countDocuments({ status: TRANSFER_STATUS.SCHEDULED }),
    Transfer.countDocuments({ status: TRANSFER_STATUS.PARTIALLY_COMPLETED }),
    Transfer.countDocuments({ status: TRANSFER_STATUS.COMPLETED }),
    Transfer.countDocuments({ status: TRANSFER_STATUS.CANCELLED }),
    Medicine.countDocuments({ status: MEDICINE_STATUS.TRANSFERRED }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        total,
        scheduled,
        partiallyCompleted,
        completed,
        cancelled,
        medicinesTransferred,
      },
      'Transfer summary statistics retrieved.'
    )
  );
});

/**
 * Get unredacted custody trace for any medicine.
 * @route GET /api/admin/custody/:medicineId
 */
export const getAdminCustodyTrace = asyncHandler(async (req, res) => {
  const { medicineId } = req.params;

  const medicine = await Medicine.findOne({
    $or: [
      { medicineId },
      { _id: medicineId.match(/^[0-9a-fA-F]{24}$/) ? medicineId : null },
    ],
  });

  if (!medicine) {
    throw new ApiError(404, 'Medicine record not found.');
  }

  const trace = await buildTrace(medicine._id, ROLES.ADMIN);

  res.status(200).json(new ApiResponse(200, trace, 'Admin custody trace retrieved.'));
});

/**
 * Runs full cryptographic hash chain verification across all medicine custody chains.
 * @route POST /api/admin/custody/verify
 */
export const verifyAllCustodyChains = asyncHandler(async (_req, res) => {
  const distinctMedicineIds = await CustodyEvent.distinct('medicineId');

  let validChains = 0;
  const brokenChains = [];

  for (const medId of distinctMedicineIds) {
    const result = await verifyChain(medId);
    if (result.valid) {
      validChains++;
    } else {
      brokenChains.push({
        medicineId: medId,
        reason: result.reason,
        eventSeq: result.eventSeq,
      });
    }
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        totalChains: distinctMedicineIds.length,
        validChains,
        brokenChainsCount: brokenChains.length,
        brokenChains,
      },
      brokenChains.length === 0
        ? 'All custody chains verified successfully. Cryptographic integrity confirmed.'
        : `Custody integrity alert: ${brokenChains.length} chain(s) failed hash verification!`
    )
  );
});

/**
 * Helper to mask IP addresses (hide last octet for privacy)
 */
const maskIp = (ip) => {
  if (!ip) return 'N/A';
  const parts = String(ip).split('.');
  if (parts.length === 4) {
    return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
  }
  return 'xxx.xxx.xxx.xxx';
};

/**
 * Get all users across the platform with role-specific metrics.
 * @route GET /api/admin/users/all
 */
export const getAllUsers = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const skip = (page - 1) * limit;

  const { role, accountStatus, search } = req.query;

  const query = {};
  if (role && role !== 'all') query.role = role;
  if (accountStatus && accountStatus !== 'all') query.accountStatus = accountStatus;

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [
      { name: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
    ];
  }

  const [users, total, counts] = await Promise.all([
    User.find(query)
      .select('name email role accountStatus approvalStatus statusReason createdAt lastLoginAt organizationId')
      .populate('organizationId', 'name type')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
    Promise.all([
      User.countDocuments({ role: ROLES.DONOR }),
      User.countDocuments({ role: ROLES.PHARMACIST }),
      User.countDocuments({ role: ROLES.NGO }),
      User.countDocuments({ accountStatus: 'suspended' }),
      User.countDocuments({ accountStatus: 'blocked' }),
    ]),
  ]);

  // Enrich users with role-specific counts
  const enrichedUsers = await Promise.all(
    users.map(async (u) => {
      let donationsCount = 0;
      let decisionsCount = 0;
      let orgName = u.organizationId?.name || null;

      if (u.role === ROLES.DONOR) {
        donationsCount = await Donation.countDocuments({
          donorId: u._id,
          status: { $ne: DONATION_STATUS.DRAFT },
        });
      } else if (u.role === ROLES.PHARMACIST) {
        decisionsCount = await Verification.countDocuments({ pharmacistId: u._id });
      }

      return {
        ...u,
        donationsCount,
        decisionsCount,
        organizationName: orgName,
      };
    })
  );

  res.status(200).json(
    new ApiResponse(
      200,
      {
        users: enrichedUsers,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
        counts: {
          donors: counts[0],
          pharmacists: counts[1],
          ngos: counts[2],
          suspended: counts[3],
          blocked: counts[4],
        },
      },
      'All platform users retrieved successfully.'
    )
  );
});

/**
 * Update user account status (suspend, reactivate, block)
 * @route PATCH /api/admin/users/:id/status
 */
export const updateUserStatus = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { action, reason } = req.body;

  const targetUser = await User.findById(id);
  if (!targetUser) {
    return next(new ApiError(404, 'User account not found.'));
  }

  // Prevent modifying own status or other admins
  if (targetUser._id.equals(req.user._id)) {
    return next(new ApiError(403, 'Administrators cannot modify their own account status.'));
  }

  if (targetUser.role === ROLES.ADMIN) {
    return next(new ApiError(403, 'Cannot modify the account status of another administrator.'));
  }

  let auditAction = null;

  if (action === 'suspend') {
    targetUser.accountStatus = 'suspended';
    targetUser.statusReason = reason;
    targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1; // Invalidate all active tokens immediately
    auditAction = AUDIT_ACTIONS.USER_SUSPENDED;
  } else if (action === 'reactivate') {
    targetUser.accountStatus = 'active';
    targetUser.statusReason = null;
    targetUser.failedLoginAttempts = 0;
    targetUser.lockUntil = null;
    auditAction = AUDIT_ACTIONS.USER_REACTIVATED;
  } else if (action === 'block') {
    targetUser.accountStatus = 'blocked';
    targetUser.statusReason = reason;
    targetUser.tokenVersion = (targetUser.tokenVersion || 0) + 1; // Invalidate all active tokens immediately
    auditAction = AUDIT_ACTIONS.USER_BLOCKED;

    // Release any active verification claims held by blocked pharmacist
    if (targetUser.role === ROLES.PHARMACIST) {
      await Donation.updateMany(
        {
          'verificationClaim.pharmacistId': targetUser._id,
          status: DONATION_STATUS.UNDER_VERIFICATION,
        },
        {
          $set: {
            status: DONATION_STATUS.SUBMITTED,
            verificationClaim: null,
          },
        }
      );
    }
  }

  await targetUser.save();

  // Send in-app notification & email
  await Notification.create({
    userId: targetUser._id,
    title: `Account ${action.charAt(0).toUpperCase() + action.slice(1)}ed`,
    message: `Your account has been ${action}ed by an administrator.${reason ? ` Reason: ${reason}` : ''}`,
    type: 'system',
  }).catch(() => {});

  if (targetUser.email) {
    await sendAccountStatusChangedEmail({
      to: targetUser.email,
      name: targetUser.name,
      action,
      reason,
    }).catch(() => {});
  }

  await recordAuditLog({
    userId: req.user._id,
    action: auditAction,
    req,
    meta: {
      targetUserId: targetUser._id,
      targetUserEmail: targetUser.email,
      targetUserRole: targetUser.role,
      action,
      reason,
    },
  });

  res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role,
          accountStatus: targetUser.accountStatus,
          statusReason: targetUser.statusReason,
        },
      },
      `User account successfully ${action}ed.`
    )
  );
});

/**
 * View paginated audit logs with masked IPs
 * @route GET /api/admin/audit
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);
  const skip = (page - 1) * limit;

  const { userId, action, from, to, search } = req.query;

  const query = {};
  if (userId) query.userId = userId;
  if (action && action !== 'all') query.action = action;

  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  if (search) {
    const searchRegex = new RegExp(search.trim(), 'i');
    query.$or = [{ action: searchRegex }, { actorType: searchRegex }];
  }

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .populate('userId', 'name email role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  const maskedLogs = logs.map((l) => ({
    ...l,
    ip: maskIp(l.ip),
  }));

  res.status(200).json(
    new ApiResponse(
      200,
      {
        logs: maskedLogs,
        total,
        page,
        totalPages: Math.ceil(total / limit) || 1,
      },
      'Audit logs retrieved successfully.'
    )
  );
});

/**
 * Export audit logs to safe CSV
 * @route GET /api/admin/audit/export.csv
 */
export const exportAuditLogsCsv = asyncHandler(async (req, res) => {
  const { userId, action, from, to } = req.query;

  const query = {};
  if (userId) query.userId = userId;
  if (action && action !== 'all') query.action = action;

  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="medibridge-audit-logs.csv"');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');

  res.write('\uFEFF'); // UTF-8 BOM
  const headers = ['Action', 'Actor Type', 'User Email', 'Timestamp (IST)', 'Masked IP'];
  res.write(headers.map(sanitizeCsvCell).join(',') + '\n');

  const cursor = AuditLog.find(query)
    .populate('userId', 'email')
    .sort({ createdAt: -1 })
    .limit(5000)
    .lean()
    .cursor({ batchSize: 500 });

  let rowCount = 0;
  for await (const doc of cursor) {
    rowCount++;
    const row = [
      doc.action || '',
      doc.actorType || '',
      doc.userId?.email || 'N/A',
      doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
      maskIp(doc.ip),
    ];
    res.write(row.map(sanitizeCsvCell).join(',') + '\n');
  }

  res.end();

  await recordAuditLog({
    userId: req.user._id,
    action: AUDIT_ACTIONS.ADMIN_AUDIT_EXPORTED,
    req,
    meta: {
      rowCount,
      query: { action, from, to },
    },
  });
});

export default {
  getOrganizations,
  getOrganizationById,
  reviewOrganization,
  getUsers,
  getAllUsers,
  updateUserStatus,
  getAuditLogs,
  exportAuditLogsCsv,
  reviewUser,
  getOverview,
  forceReleaseDonation,
  getVerificationLog,
  getVerificationSummary,
  getMatchingSummary,
  getAdminClaims,
  cancelAdminClaim,
  getAdminRequirements,
  getOrganizationsMap,
  getAdminTransfers,
  getAdminTransfersSummary,
  getAdminCustodyTrace,
  verifyAllCustodyChains,
};

