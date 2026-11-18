import asyncHandler from '../middleware/asyncHandler.js';
import ApiResponse from '../utils/ApiResponse.js';
import { findNearbyOrganizations } from '../services/geo.service.js';

/**
 * Find verified organizations nearby a given coordinate.
 * @route GET /api/geo/organizations/nearby
 */
export const getNearbyOrganizations = asyncHandler(async (req, res) => {
  const { lat, lng, radiusKm, type, search, page, limit } = req.query;

  const result = await findNearbyOrganizations({
    lat,
    lng,
    radiusKm,
    type,
    search,
    page,
    limit,
  });

  res.status(200).json(
    new ApiResponse(
      200,
      result,
      'Nearby verified organizations retrieved successfully.'
    )
  );
});

export default {
  getNearbyOrganizations,
};
