import asyncHandler from '../middleware/asyncHandler.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Donation from '../models/Donation.js';
import Notification from '../models/Notification.js';
import AuditLog from '../models/AuditLog.js';
import Claim from '../models/Claim.js';
import Request from '../models/Request.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import verificationService from '../services/verification.service.js';
import { cancelClaim as cancelClaimService } from '../services/claim.service.js';
import {
  sendOrgVerifiedEmail,
  sendOrgRejectedEmail,
  sendUserApprovedEmail,
  sendUserRejectedEmail,
} from '../services/email.service.js';
import recordAuditLog from '../services/audit.service.js';
import {
  ORG_STATUS,
  ROLES,
  APPROVAL_STATUS,
  AUDIT_ACTIONS,
  DONATION_STATUS,
  CLAIM_STATUS,
  REQUEST_STATUS,
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

export default {
  getOrganizations,
  getOrganizationById,
  reviewOrganization,
  getUsers,
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
};
