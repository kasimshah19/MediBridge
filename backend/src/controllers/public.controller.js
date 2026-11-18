import asyncHandler from '../middleware/asyncHandler.js';
import Organization from '../models/Organization.js';
import User from '../models/User.js';
import Medicine from '../models/Medicine.js';
import Transfer from '../models/Transfer.js';
import ApiResponse from '../utils/ApiResponse.js';
import ApiError from '../utils/ApiError.js';
import {
  ORG_STATUS,
  ROLES,
  APPROVAL_STATUS,
  EXPIRY_THRESHOLDS,
  ALERT_DAYS,
  TRANSFER_STATUS,
  MEDICINE_STATUS,
} from '../config/constants.js';
import env from '../config/env.js';
import { verifyMedicineToken } from '../services/qr.service.js';
import { buildTrace } from '../services/custody.service.js';

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
    completedHandovers,
    transferredMedsCount,
  ] = await Promise.all([
    Organization.countDocuments({ verificationStatus: ORG_STATUS.VERIFIED }),
    User.countDocuments({ role: ROLES.DONOR }),
    User.countDocuments({
      role: ROLES.PHARMACIST,
      approvalStatus: APPROVAL_STATUS.APPROVED,
    }),
    Organization.distinct('city', { verificationStatus: ORG_STATUS.VERIFIED }),
    Transfer.countDocuments({ status: TRANSFER_STATUS.COMPLETED }),
    Medicine.countDocuments({ status: MEDICINE_STATUS.TRANSFERRED }),
  ]);

  res.status(200).json(
    new ApiResponse(
      200,
      {
        verifiedOrganizations,
        registeredDonors,
        verifiedPharmacists,
        citiesCovered: distinctCities.length,
        completedHandovers,
        medicinesTransferred: transferredMedsCount,
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
        priorityThresholds: EXPIRY_THRESHOLDS,
        alertDays: ALERT_DAYS,
        geoRadiiKm: env.GEO_RADII_KM,
        defaultRadiusKm: env.DEFAULT_RADIUS_KM,
        maxRadiusKm: env.MAX_RADIUS_KM || 20,
        claimResponseTtlHours: env.CLAIM_RESPONSE_TTL_HOURS,
        maxPendingClaimsPerOrg: env.MAX_PENDING_CLAIMS_PER_ORG,
        maxOpenRequirementsPerOrg: env.MAX_OPEN_REQUIREMENTS_PER_ORG,
        handoverTokenTtlMinutes: env.HANDOVER_TOKEN_TTL_MINUTES || 15,
        handoverReminderDays: env.HANDOVER_REMINDER_DAYS || 3,
        handoverAutoCancelDays: env.HANDOVER_AUTO_CANCEL_DAYS || 14,
      },
      'Public platform configuration retrieved successfully.'
    )
  );
});

/**
 * Public verification endpoint for medicine QR codes.
 * Returns public-safe medicine profile and immutable hash-chained custody trail.
 * Strictly no donor or pharmacist PII (email, phone, home address).
 * @route GET /api/public/verify/:medicineId
 */
export const verifyMedicinePublic = asyncHandler(async (req, res) => {
  const { medicineId } = req.params;
  const token = req.query.t || req.query.token;

  const medicine = await Medicine.findOne({
    $or: [
      { medicineId },
      { _id: medicineId.match(/^[0-9a-fA-F]{24}$/) ? medicineId : null },
    ],
  });

  if (!medicine) {
    throw new ApiError(404, 'Medicine code not recognized in the MediBridge registry.');
  }

  // Token authenticity verification
  let tokenValid = false;
  if (token && typeof token === 'string') {
    tokenValid = verifyMedicineToken(
      token,
      medicine.medicineId,
      medicine.qr?.issuedAt || null
    );
  }

  // Fetch verified custody trail (role = 'public' sanitizes PII)
  const custodyTrace = await buildTrace(medicine._id, 'public');

  const sanitizedMedicine = {
    medicineId: medicine.medicineId,
    name: medicine.name,
    genericName: medicine.genericName,
    manufacturer: medicine.manufacturer,
    batchNumber: medicine.batchNumber,
    expiryDate: medicine.expiryDate,
    quantity: medicine.quantity,
    unit: medicine.unit,
    status: medicine.status,
    currentHolder: medicine.currentHolder || null,
    qrIssuedAt: medicine.qr?.issuedAt || null,
  };

  res.status(200).json(
    new ApiResponse(
      200,
      {
        medicine: sanitizedMedicine,
        custody: custodyTrace,
        tokenValid,
      },
      tokenValid
        ? 'Medicine verified successfully with genuine QR security token.'
        : 'Medicine registry record retrieved (no valid security token provided).'
    )
  );
});

export default {
  getPublicStats,
  getPublicOrganizations,
  getPublicConfig,
  verifyMedicinePublic,
};
