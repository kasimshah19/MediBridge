import asyncHandler from '../middleware/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import Request from '../models/Request.js';
import Claim from '../models/Claim.js';
import { REQUEST_STATUS, CLAIM_STATUS, DEFAULT_RADIUS_KM } from '../config/constants.js';
import { findAvailableMedicinesNear } from '../services/geo.service.js';

/**
 * Get NGO dashboard overview statistics.
 * @route GET /api/ngo/summary
 */
export const getNgoSummary = asyncHandler(async (req, res) => {
  const org = req.organization;

  const [
    openRequirements,
    fulfilledRequirements,
    pendingClaims,
    acceptedMatches,
    recentClaims,
  ] = await Promise.all([
    Request.countDocuments({
      organizationId: org._id,
      status: REQUEST_STATUS.OPEN,
    }),
    Request.countDocuments({
      organizationId: org._id,
      status: REQUEST_STATUS.FULFILLED,
    }),
    Claim.countDocuments({
      organizationId: org._id,
      status: CLAIM_STATUS.PENDING,
    }),
    Claim.countDocuments({
      organizationId: org._id,
      status: CLAIM_STATUS.ACCEPTED,
    }),
    Claim.find({ organizationId: org._id })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('donorId', 'city')
      .populate('donationId', 'donationCode'),
  ]);

  // Find available medicines count in default radius
  let availableNearbyCount = 0;
  if (
    org.location?.coordinates &&
    (org.location.coordinates[0] !== 0 || org.location.coordinates[1] !== 0)
  ) {
    try {
      const nearbyRes = await findAvailableMedicinesNear({
        lat: org.location.coordinates[1],
        lng: org.location.coordinates[0],
        radiusKm: DEFAULT_RADIUS_KM,
        organizationId: org._id,
        limit: 1,
      });
      availableNearbyCount = nearbyRes.total;
    } catch (_err) {
      availableNearbyCount = 0;
    }
  }

  res.status(200).json(
    new ApiResponse(
      200,
      {
        openRequirements,
        fulfilledRequirements,
        pendingClaims,
        acceptedMatches,
        availableNearbyCount,
        recentClaims,
      },
      'NGO summary metrics retrieved.'
    )
  );
});

/**
 * Search available approved medicines within radius of the NGO.
 * @route GET /api/ngo/available
 */
export const getAvailableMedicines = asyncHandler(async (req, res) => {
  const org = req.organization;
  const { radiusKm = DEFAULT_RADIUS_KM, search = '', page = 1, limit = 10 } = req.query;

  const lat = req.query.lat ? parseFloat(req.query.lat) : org.location.coordinates[1];
  const lng = req.query.lng ? parseFloat(req.query.lng) : org.location.coordinates[0];

  const result = await findAvailableMedicinesNear({
    lat,
    lng,
    radiusKm: parseFloat(radiusKm) || DEFAULT_RADIUS_KM,
    search,
    organizationId: org._id,
    page: parseInt(page, 10) || 1,
    limit: parseInt(limit, 10) || 10,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      result,
      'Available medicines retrieved successfully.'
    )
  );
});

export default {
  getNgoSummary,
  getAvailableMedicines,
};
