import mongoose from 'mongoose';
import Organization from '../models/Organization.js';
import Donation from '../models/Donation.js';
import Medicine from '../models/Medicine.js';
import Request from '../models/Request.js';
import Claim from '../models/Claim.js';
import {
  ORG_STATUS,
  DONATION_STATUS,
  MEDICINE_STATUS,
  REQUEST_STATUS,
  CLAIM_STATUS,
} from '../config/constants.js';
import { roundCoordinate, scoreMatch } from '../utils/geo.js';
import { decorateMedicine } from './expiry.service.js';

/**
 * Finds verified organizations within a given radius using MongoDB $geoNear.
 * Protects institution privacy by stripping internal documents and owner credentials.
 *
 * @param {Object} options
 * @param {number} options.lat - Latitude (India bounds)
 * @param {number} options.lng - Longitude (India bounds)
 * @param {number} [options.radiusKm=10] - Search radius in kilometers
 * @param {string} [options.type] - Optional organization type filter ('ngo', 'charitable_clinic')
 * @param {string} [options.search] - Optional text search in name or city
 * @param {number} [options.limit=50] - Maximum organizations to return
 * @returns {Promise<Array>} List of sanitized nearby organizations
 */
export const findNearbyOrganizations = async ({
  lat,
  lng,
  radiusKm = 10,
  type = null,
  search = '',
  limit = 50,
}) => {
  const maxDistanceMeters = Math.max(1, radiusKm) * 1000;
  const now = new Date();

  // Query filter applied inside $geoNear
  const matchFilter = {
    verificationStatus: ORG_STATUS.VERIFIED,
  };

  if (type) {
    matchFilter.type = type;
  }

  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim(), 'i');
    matchFilter.$or = [{ name: searchRegex }, { city: searchRegex }];
  }

  const pipeline = [
    {
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng, lat],
        },
        distanceField: 'distanceMeters',
        maxDistance: maxDistanceMeters,
        spherical: true,
        key: 'location',
        query: matchFilter,
      },
    },
    {
      $lookup: {
        from: 'requests',
        let: { orgId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$organizationId', '$$orgId'] },
                  { $eq: ['$status', REQUEST_STATUS.OPEN] },
                  {
                    $or: [
                      { $eq: ['$neededBy', null] },
                      { $gte: ['$neededBy', now] },
                    ],
                  },
                ],
              },
            },
          },
          { $count: 'count' },
        ],
        as: 'openReqCountArr',
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        city: 1,
        state: 1,
        servicesOffered: 1,
        description: 1,
        distanceKm: {
          $round: [{ $divide: ['$distanceMeters', 1000] }, 1],
        },
        openRequirementsCount: {
          $ifNull: [{ $arrayElemAt: ['$openReqCountArr.count', 0] }, 0],
        },
        location: {
          lat: { $arrayElemAt: ['$location.coordinates', 1] },
          lng: { $arrayElemAt: ['$location.coordinates', 0] },
        },
      },
    },
    { $sort: { distanceKm: 1 } },
    { $limit: Math.max(1, Math.min(100, limit)) },
  ];

  return Organization.aggregate(pipeline);
};

/**
 * Finds available approved medicine donations near an NGO's location.
 * Sanitizes location with roundCoordinate to 2 decimals (~1 km grid) and strips donor identity.
 *
 * @param {Object} org - Organization document containing location
 * @param {Object} options
 * @param {number} [options.radiusKm=10]
 * @param {string} [options.search='']
 * @param {string} [options.type] - Medicine type filter
 * @param {string} [options.priority] - Priority filter
 * @param {boolean} [options.matchOnly=false]
 * @param {string} [options.sort='best_match']
 * @param {number} [options.page=1]
 * @param {number} [options.limit=10]
 * @returns {Promise<Object>} Paginated donation groups with match scores
 */
export const findAvailableMedicinesNear = async (
  org,
  {
    radiusKm = 10,
    search = '',
    type = null,
    priority = null,
    matchOnly = false,
    sort = 'best_match',
    page = 1,
    limit = 10,
  } = {}
) => {
  const maxDistanceMeters = Math.max(1, radiusKm) * 1000;
  const now = new Date();
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(50, parseInt(limit, 10) || 10));

  // 1. Fetch organization's active requirements for matching
  const openRequirements = await Request.find({
    organizationId: org._id,
    status: REQUEST_STATUS.OPEN,
    $or: [{ neededBy: null }, { neededBy: { $gte: now } }],
  }).lean();

  // 2. Aggregate approved donations within radius
  const pipeline = [
    {
      $geoNear: {
        near: org.location,
        distanceField: 'distanceMeters',
        maxDistance: maxDistanceMeters,
        spherical: true,
        key: 'location',
        query: { status: DONATION_STATUS.APPROVED },
      },
    },
    {
      $lookup: {
        from: 'medicines',
        let: { donationId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$donationId', '$$donationId'] },
                  { $eq: ['$status', MEDICINE_STATUS.APPROVED] },
                  {
                    $or: [
                      { $eq: ['$reservation', null] },
                      { $eq: ['$reservation.claimId', null] },
                    ],
                  },
                  { $gt: ['$expiryDate', now] },
                ],
              },
            },
          },
        ],
        as: 'approvedItems',
      },
    },
    {
      // Only keep donations that actually have at least 1 approved, unreserved, non-expired item
      $match: {
        'approvedItems.0': { $exists: true },
      },
    },
  ];

  const nearbyDonations = await Donation.aggregate(pipeline);

  // 3. Check for existing active claims between this org and these donations
  const donationIds = nearbyDonations.map((d) => d._id);
  const activeClaims = await Claim.find({
    organizationId: org._id,
    donationId: { $in: donationIds },
    status: { $in: [CLAIM_STATUS.PENDING, CLAIM_STATUS.ACCEPTED] },
  }).select('donationId status');

  const activeClaimDonationMap = new Set(activeClaims.map((c) => c.donationId.toString()));

  // 4. Score items and structure privacy-safe groups
  const groups = [];

  for (const d of nearbyDonations) {
    const distanceKm = Math.round((d.distanceMeters / 1000) * 10) / 10;
    const hasActiveClaim = activeClaimDonationMap.has(d._id.toString());

    // Approximate location (rounded to 2 decimals)
    const exactLat = d.location?.coordinates?.[1] || 0;
    const exactLng = d.location?.coordinates?.[0] || 0;
    const approxLoc = roundCoordinate(exactLat, exactLng, 2);

    let bestMatchScore = 0;
    const itemsAvailable = [];

    for (const rawItem of d.approvedItems) {
      // Decorate with real daysLeft and priority
      const item = decorateMedicine(rawItem, now);

      // Filters
      if (type && item.medicineType !== type) continue;
      if (priority && item.effectivePriority !== priority) continue;

      if (search && search.trim()) {
        const sRegex = new RegExp(search.trim(), 'i');
        const match = sRegex.test(item.name) || sRegex.test(item.genericName);
        if (!match) continue;
      }

      // Find highest match score across the org's requirements
      let itemBestScore = 0;
      let itemBestReasons = [];

      if (openRequirements.length > 0) {
        for (const req of openRequirements) {
          const res = scoreMatch(item, req, { distanceKm, maxRadiusKm: radiusKm, now });
          if (res.score > itemBestScore) {
            itemBestScore = res.score;
            itemBestReasons = res.reasons;
          }
        }
      } else {
        const res = scoreMatch(item, null, { distanceKm, maxRadiusKm: radiusKm, now });
        itemBestScore = res.score;
        itemBestReasons = res.reasons;
      }

      if (matchOnly && itemBestScore < 30) {
        continue;
      }

      if (itemBestScore > bestMatchScore) {
        bestMatchScore = itemBestScore;
      }

      itemsAvailable.push({
        medicineId: item._id,
        name: item.name,
        genericName: item.genericName || '',
        manufacturer: item.manufacturer || '',
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
        daysLeft: item.daysLeft,
        effectivePriority: item.effectivePriority,
        expiryLabel: item.expiryLabel,
        quantity: item.quantity,
        unit: item.unit,
        medicineType: item.medicineType,
        matchScore: itemBestScore,
        matchReasons: itemBestReasons,
      });
    }

    if (itemsAvailable.length === 0) continue;

    groups.push({
      donationId: d._id,
      donationCode: d.donationCode,
      city: d.pickupAddress?.city || '—',
      approximateLocation: approxLoc,
      distanceKm,
      itemsAvailable,
      bestMatchScore,
      hasActiveClaim,
    });
  }

  // 5. Sort groups
  if (sort === 'nearest') {
    groups.sort((a, b) => a.distanceKm - b.distanceKm);
  } else if (sort === 'expiry_soonest') {
    groups.sort((a, b) => {
      const minA = Math.min(...a.itemsAvailable.map((i) => i.daysLeft));
      const minB = Math.min(...b.itemsAvailable.map((i) => i.daysLeft));
      return minA - minB;
    });
  } else if (sort === 'newest') {
    // Keep insertion order (or code)
    groups.reverse();
  } else {
    // Default: best_match
    groups.sort((a, b) => b.bestMatchScore - a.bestMatchScore || a.distanceKm - b.distanceKm);
  }

  // 6. Pagination
  const total = groups.length;
  const totalPages = Math.ceil(total / limitNum) || 1;
  const skip = (pageNum - 1) * limitNum;
  const paginatedGroups = groups.slice(skip, skip + limitNum);

  return {
    donations: paginatedGroups,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages,
    },
  };
};

/**
 * Finds nearby verified organizations matching a specific approved donation's items.
 *
 * @param {Object} donation - The donation document (must have status === 'approved')
 * @param {Object} options
 * @param {number} [options.radiusKm=10]
 * @param {string} [options.sort='best_match'] - 'best_match' | 'nearest'
 * @returns {Promise<Array>} List of organizations with match scores
 */
export const findNearbyOrganizationsForDonation = async (
  donation,
  { radiusKm = 10, sort = 'best_match' } = {}
) => {
  const maxDistanceMeters = Math.max(1, radiusKm) * 1000;
  const now = new Date();

  // 1. Get donation approved, unreserved items
  const items = await Medicine.find({
    donationId: donation._id,
    status: MEDICINE_STATUS.APPROVED,
    $or: [{ reservation: null }, { 'reservation.claimId': null }],
    expiryDate: { $gt: now },
  }).lean();

  const decoratedItems = items.map((i) => decorateMedicine(i, now));

  // 2. Find verified organizations within radius using $geoNear
  const pipeline = [
    {
      $geoNear: {
        near: donation.location,
        distanceField: 'distanceMeters',
        maxDistance: maxDistanceMeters,
        spherical: true,
        key: 'location',
        query: { verificationStatus: ORG_STATUS.VERIFIED },
      },
    },
    {
      $project: {
        _id: 1,
        name: 1,
        type: 1,
        city: 1,
        state: 1,
        servicesOffered: 1,
        description: 1,
        distanceKm: {
          $round: [{ $divide: ['$distanceMeters', 1000] }, 1],
        },
        location: {
          lat: { $arrayElemAt: ['$location.coordinates', 1] },
          lng: { $arrayElemAt: ['$location.coordinates', 0] },
        },
      },
    },
  ];

  const nearbyOrgs = await Organization.aggregate(pipeline);

  if (nearbyOrgs.length === 0) return [];

  const orgIds = nearbyOrgs.map((o) => o._id);

  // 3. Fetch all open requirements for these nearby orgs
  const [openReqs, existingClaims] = await Promise.all([
    Request.find({
      organizationId: { $in: orgIds },
      status: REQUEST_STATUS.OPEN,
      $or: [{ neededBy: null }, { neededBy: { $gte: now } }],
    }).lean(),
    Claim.find({
      donationId: donation._id,
      organizationId: { $in: orgIds },
      status: { $in: [CLAIM_STATUS.PENDING, CLAIM_STATUS.ACCEPTED] },
    }).select('organizationId status'),
  ]);

  const activeClaimOrgSet = new Set(existingClaims.map((c) => c.organizationId.toString()));

  // Group requirements by organizationId
  const reqMap = new Map();
  for (const r of openReqs) {
    const oId = r.organizationId.toString();
    if (!reqMap.has(oId)) reqMap.set(oId, []);
    reqMap.get(oId).push(r);
  }

  // 4. Compute matches per organization
  const results = [];

  for (const org of nearbyOrgs) {
    const orgReqs = reqMap.get(org._id.toString()) || [];
    const hasActiveClaim = activeClaimOrgSet.has(org._id.toString());

    let bestScore = 0;
    const matchedRequirements = [];

    for (const req of orgReqs) {
      let reqBestScore = 0;
      let reqBestItemName = '';
      let reqReasons = [];

      for (const item of decoratedItems) {
        const s = scoreMatch(item, req, {
          distanceKm: org.distanceKm,
          maxRadiusKm: radiusKm,
          now,
        });

        if (s.score > reqBestScore) {
          reqBestScore = s.score;
          reqBestItemName = item.name;
          reqReasons = s.reasons;
        }
      }

      if (reqBestScore > 0) {
        matchedRequirements.push({
          requirementId: req._id,
          medicineName: req.medicineName,
          urgency: req.urgency,
          matchedDonatedItem: reqBestItemName,
          score: reqBestScore,
          reasons: reqReasons,
        });
      }

      if (reqBestScore > bestScore) {
        bestScore = reqBestScore;
      }
    }

    results.push({
      organization: {
        _id: org._id,
        name: org.name,
        type: org.type,
        city: org.city,
        state: org.state,
        servicesOffered: org.servicesOffered || [],
        description: org.description || '',
        location: org.location,
        distanceKm: org.distanceKm,
        openRequirementsCount: orgReqs.length,
      },
      bestMatchScore: bestScore,
      matchedRequirements,
      hasActiveClaim,
      availableItemsCount: decoratedItems.length,
    });
  }

  // 5. Sort
  if (sort === 'nearest') {
    results.sort((a, b) => a.organization.distanceKm - b.organization.distanceKm);
  } else {
    // Default: best_match then nearest
    results.sort(
      (a, b) =>
        b.bestMatchScore - a.bestMatchScore ||
        a.organization.distanceKm - b.organization.distanceKm
    );
  }

  return results;
};

export default {
  findNearbyOrganizations,
  findAvailableMedicinesNear,
  findNearbyOrganizationsForDonation,
};
