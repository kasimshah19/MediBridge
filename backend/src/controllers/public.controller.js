import asyncHandler from '../middleware/asyncHandler.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import ApiResponse from '../utils/ApiResponse.js';
import { ORG_STATUS, ROLES, APPROVAL_STATUS } from '../config/constants.js';
import env from '../config/env.js';

/**
 * Get real, verified public impact statistics.
 * No fake data or hardcoded numbers.
 * @route GET /api/public/stats
 */
export const getPublicStats = asyncHandler(async (_req, res) => {
  const [
    verifiedOrganizations,
    registeredDonors,
    verifiedPharmacists,
    distinctCities,
  ] = await Promise.all([
    Organization.countDocuments({ verificationStatus: ORG_STATUS.VERIFIED }),
    User.countDocuments({ role: ROLES.DONOR }),
    User.countDocuments({
      role: ROLES.PHARMACIST,
      approvalStatus: APPROVAL_STATUS.APPROVED,
    }),
    Organization.distinct('city', { verificationStatus: ORG_STATUS.VERIFIED }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        verifiedOrganizations,
        registeredDonors,
        verifiedPharmacists,
        citiesCovered: distinctCities.length,
      },
      'Public statistics retrieved successfully.'
    )
  );
});

/**
 * Get verified partner organizations list for the public showcase.
 * Only returns verified organizations with sanitized, public fields.
 * @route GET /api/public/organizations
 */
export const getPublicOrganizations = asyncHandler(async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 6, 20);

  const organizations = await Organization.find({
    verificationStatus: ORG_STATUS.VERIFIED,
  })
    .select('name type city state servicesOffered createdAt')
    .sort({ verifiedAt: -1, createdAt: -1 })
    .limit(limit);

  res.status(200).json(
    new ApiResponse(
      200,
      { organizations },
      'Verified partner organizations retrieved successfully.'
    )
  );
});

/**
 * Get public platform policies and donation configuration limits.
 * @route GET /api/public/config
 */
export const getPublicConfig = asyncHandler(async (_req, res) => {
  res.status(200).json(
    new ApiResponse(
      200,
      {
        minShelfLifeDays: env.MIN_REMAINING_SHELF_LIFE_DAYS,
        maxItems: env.MAX_ITEMS_PER_DONATION,
        maxPhotos: env.MAX_PHOTOS_PER_MEDICINE,
      },
      'Public platform configuration retrieved successfully.'
    )
  );
});

export default {
  getPublicStats,
  getPublicOrganizations,
  getPublicConfig,
};

