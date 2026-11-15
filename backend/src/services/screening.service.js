import {
  SCREENING_CODES,
  PACKAGING_CONDITION,
  STORAGE_CONDITION,
  MEDICINE_TYPE,
  MEDICINE_UNIT,
  COLD_CHAIN_KEYWORDS,
  CONTROLLED_SUBSTANCE_KEYWORDS,
} from '../config/constants.js';
import { calculateRemainingDays, normalizeExpiryDate } from './expiry.service.js';

/**
 * Pure automated screening engine for donated medicines.
 * Gathers ALL applicable violation reasons without early return.
 *
 * @param {Object} medicine - Medicine item data
 * @param {Object} options
 * @param {Date} [options.now=new Date()] - Reference point in time
 * @param {number} [options.minShelfLifeDays=90] - Configured minimum shelf life policy
 * @param {Object} [options.declarations] - Donation declaration flags (optional)
 * @returns {{ status: 'passed' | 'rejected', reasons: Array<{ code: string, message: string }> }}
 */
export const screenMedicine = (
  medicine,
  { now = new Date(), minShelfLifeDays = 90, declarations = null } = {}
) => {
  const reasons = [];

  const nameStr = `${medicine.name || ''} ${medicine.genericName || ''}`.toLowerCase();

  // 1. Expiry & Shelf Life Checks
  const normalizedExpiry = medicine.expiryDate
    ? normalizeExpiryDate(medicine.expiryDate)
    : null;

  if (!normalizedExpiry) {
    reasons.push({
      code: SCREENING_CODES.EXPIRED,
      message: 'A valid medicine expiration date is required.',
    });
  } else {
    const remainingDays = calculateRemainingDays(normalizedExpiry, now);

    if (remainingDays <= 0) {
      const formattedDate = normalizedExpiry.toLocaleDateString('en-IN', {
        month: 'short',
        year: 'numeric',
      });
      reasons.push({
        code: SCREENING_CODES.EXPIRED,
        message: `This medicine has expired (${formattedDate}). Expired pharmaceuticals cannot be accepted or redistributed.`,
      });
    } else if (remainingDays < minShelfLifeDays) {
      reasons.push({
        code: SCREENING_CODES.SHELF_LIFE_TOO_SHORT,
        message: `This medicine expires in ${remainingDays} days. We need at least ${minShelfLifeDays} days remaining shelf life for verification, matching, and safe redistribution.`,
      });
    }
  }

  // 2. Packaging Condition Checks
  if (medicine.packagingCondition === PACKAGING_CONDITION.LOOSE_TABLETS) {
    reasons.push({
      code: SCREENING_CODES.LOOSE_TABLETS,
      message:
        'Loose tablets and cut strips cannot be accepted due to safety, hygiene, and strict batch traceability regulations.',
    });
  } else if (
    medicine.packagingCondition === PACKAGING_CONDITION.OPENED ||
    medicine.packagingCondition === PACKAGING_CONDITION.DAMAGED
  ) {
    reasons.push({
      code: SCREENING_CODES.PACKAGING_NOT_SEALED,
      message: `Packaging condition is reported as ${medicine.packagingCondition}. Only sealed, untampered boxes and intact blister strips are accepted.`,
    });
  }

  // 3. Injections & Vials Checks
  if (
    medicine.medicineType === MEDICINE_TYPE.INJECTION ||
    medicine.unit === MEDICINE_UNIT.VIAL
  ) {
    reasons.push({
      code: SCREENING_CODES.INJECTION_NOT_ACCEPTED,
      message:
        'Injectable medications and glass vials cannot be accepted through community donations due to biohazard and safe administration protocols.',
    });
  }

  // 4. Cold Chain / Refrigerated Checks
  const matchedColdChain = COLD_CHAIN_KEYWORDS.find((keyword) =>
    nameStr.includes(keyword.toLowerCase())
  );

  if (
    medicine.storageCondition === STORAGE_CONDITION.REFRIGERATED ||
    Boolean(matchedColdChain)
  ) {
    const detail = matchedColdChain ? ` (${matchedColdChain})` : '';
    reasons.push({
      code: SCREENING_CODES.COLD_CHAIN_NOT_ACCEPTED,
      message: `Cold-chain and refrigerated medications${detail} cannot be accepted because unbroken temperature control (2°C-8°C) cannot be guaranteed during domestic storage and transport.`,
    });
  }

  // 5. Controlled Substances Checks
  const matchedControlled = CONTROLLED_SUBSTANCE_KEYWORDS.find((keyword) =>
    nameStr.includes(keyword.toLowerCase())
  );

  const declarationFailed = declarations && declarations.notControlled === false;

  if (Boolean(matchedControlled) || declarationFailed) {
    const detail = matchedControlled ? ` (${matchedControlled})` : '';
    reasons.push({
      code: SCREENING_CODES.CONTROLLED_SUBSTANCE,
      message: `Controlled pharmaceuticals and narcotic/psychotropic substances${detail} are strictly restricted under drug control laws and cannot be transferred through this platform.`,
    });
  }

  // 6. Bad Storage Conditions
  if (medicine.storageCondition === STORAGE_CONDITION.EXPOSED_HEAT_OR_MOISTURE) {
    reasons.push({
      code: SCREENING_CODES.BAD_STORAGE,
      message:
        'Medicines exposed to extreme heat, direct sunlight, or high moisture cannot be accepted as active chemical stability may be compromised.',
    });
  }

  // 7. Unreadable or Missing Batch Number
  const batch = (medicine.batchNumber || '').trim();
  if (!batch || batch.length < 3) {
    reasons.push({
      code: SCREENING_CODES.UNREADABLE_BATCH,
      message:
        'A valid, readable batch number of at least 3 characters is mandatory for regulatory traceability and verification.',
    });
  }

  // 8. Missing Photos Check (at submit time)
  if (!medicine.photos || medicine.photos.length === 0) {
    reasons.push({
      code: SCREENING_CODES.MISSING_PHOTO,
      message:
        'At least one clear photo of the medicine packaging and printed batch/expiry details is required for pharmacist inspection.',
    });
  }

  return {
    status: reasons.length === 0 ? 'passed' : 'rejected',
    reasons,
  };
};

export default {
  screenMedicine,
};

