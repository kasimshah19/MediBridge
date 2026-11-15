import { screenMedicine } from '../src/services/screening.service.js';
import {
  normalizeExpiryDate,
  calculateRemainingDays,
  calculatePriority,
} from '../src/services/expiry.service.js';
import {
  SCREENING_CODES,
  MEDICINE_TYPE,
  PACKAGING_CONDITION,
  STORAGE_CONDITION,
  MEDICINE_UNIT,
  PRIORITY_LEVELS,
} from '../src/config/constants.js';

describe('Phase 3: Automated Screening Engine & Expiry Service Unit Tests', () => {
  const referenceNow = new Date('2026-11-15T12:00:00.000Z');

  describe('Expiry Service & MM/YYYY End-of-Month Calculations', () => {
    test('normalizes MM/YYYY to last millisecond of the month in IST', () => {
      // November 2026 has 30 days. In IST (UTC+05:30), 23:59:59.999 is 18:29:59.999Z on Nov 30
      const normalized = normalizeExpiryDate('11/2026');
      expect(normalized).toBeInstanceOf(Date);
      expect(normalized.getUTCFullYear()).toBe(2026);
      expect(normalized.getUTCMonth()).toBe(10); // Nov (0-indexed)
      expect(normalized.getUTCDate()).toBe(30);
    });

    test('normalizes YYYY-MM format correctly', () => {
      const normalized = normalizeExpiryDate('2026-12');
      expect(normalized.getUTCMonth()).toBe(11); // Dec
      expect(normalized.getUTCDate()).toBe(31);
    });

    test('computes priority correctly based on remaining days', () => {
      // 400 days in future -> normal
      const farFuture = new Date('2027-12-31T00:00:00.000Z');
      expect(calculatePriority(farFuture, referenceNow)).toBe(PRIORITY_LEVELS.NORMAL);

      // 120 days -> medium
      const medFuture = new Date(referenceNow.getTime() + 120 * 24 * 60 * 60 * 1000);
      expect(calculatePriority(medFuture, referenceNow)).toBe(PRIORITY_LEVELS.MEDIUM);

      // 60 days -> high
      const nearFuture = new Date(referenceNow.getTime() + 60 * 24 * 60 * 60 * 1000);
      expect(calculatePriority(nearFuture, referenceNow)).toBe(PRIORITY_LEVELS.HIGH);

      // 15 days -> critical
      const criticalFuture = new Date(referenceNow.getTime() + 15 * 24 * 60 * 60 * 1000);
      expect(calculatePriority(criticalFuture, referenceNow)).toBe(PRIORITY_LEVELS.CRITICAL);
    });
  });

  describe('screenMedicine Rule Checks', () => {
    const validBaseMedicine = {
      name: 'Paracetamol 500mg',
      genericName: 'Acetaminophen',
      batchNumber: 'BATCH-999',
      expiryDate: '2028-12', // >2 years
      medicineType: MEDICINE_TYPE.TABLET,
      packagingCondition: PACKAGING_CONDITION.SEALED,
      storageCondition: STORAGE_CONDITION.ROOM_TEMPERATURE,
      unit: MEDICINE_UNIT.STRIP,
      photos: [{ _id: 'photo-1' }],
    };

    test('valid medicine with 400+ days passes automated screening', () => {
      const result = screenMedicine(validBaseMedicine, {
        now: referenceNow,
        minShelfLifeDays: 90,
      });

      expect(result.status).toBe('passed');
      expect(result.reasons).toHaveLength(0);
    });

    test('rejects expired medicine with EXPIRED code', () => {
      const expiredMed = {
        ...validBaseMedicine,
        expiryDate: '2026-05', // Expired relative to Nov 2026
      };

      const result = screenMedicine(expiredMed, {
        now: referenceNow,
        minShelfLifeDays: 90,
      });

      expect(result.status).toBe('rejected');
      expect(result.reasons.some((r) => r.code === SCREENING_CODES.EXPIRED)).toBe(true);
    });

    test('rejects medicine with 45 days left under a 90-day shelf life policy', () => {
      // 45 days after referenceNow
      const shortLifeDate = new Date(referenceNow.getTime() + 45 * 24 * 60 * 60 * 1000);
      const shortLifeMed = {
        ...validBaseMedicine,
        expiryDate: shortLifeDate,
      };

      const result = screenMedicine(shortLifeMed, {
        now: referenceNow,
        minShelfLifeDays: 90,
      });

      expect(result.status).toBe('rejected');
      const reason = result.reasons.find((r) => r.code === SCREENING_CODES.SHELF_LIFE_TOO_SHORT);
      expect(reason).toBeDefined();
      expect(reason.message).toContain('at least 90 days remaining shelf life');
    });

    test('rejects opened or damaged packaging', () => {
      const openedMed = {
        ...validBaseMedicine,
        packagingCondition: PACKAGING_CONDITION.OPENED,
      };

      const result = screenMedicine(openedMed, { now: referenceNow });
      expect(result.status).toBe('rejected');
      expect(result.reasons.some((r) => r.code === SCREENING_CODES.PACKAGING_NOT_SEALED)).toBe(true);
    });

    test('rejects loose tablets with LOOSE_TABLETS code', () => {
      const looseMed = {
        ...validBaseMedicine,
        packagingCondition: PACKAGING_CONDITION.LOOSE_TABLETS,
      };

      const result = screenMedicine(looseMed, { now: referenceNow });
      expect(result.status).toBe('rejected');
      expect(result.reasons.some((r) => r.code === SCREENING_CODES.LOOSE_TABLETS)).toBe(true);
    });

    test('rejects injection medicineType and vials', () => {
      const injectionMed = {
        ...validBaseMedicine,
        medicineType: MEDICINE_TYPE.INJECTION,
      };

      const result = screenMedicine(injectionMed, { now: referenceNow });
      expect(result.status).toBe('rejected');
      expect(result.reasons.some((r) => r.code === SCREENING_CODES.INJECTION_NOT_ACCEPTED)).toBe(true);
    });

    test('rejects cold-chain medicine by name keyword (e.g. Insulin)', () => {
      const insulinMed = {
        ...validBaseMedicine,
        name: 'Human Insulin Glargine 100IU',
      };

      const result = screenMedicine(insulinMed, { now: referenceNow });
      expect(result.status).toBe('rejected');
      expect(result.reasons.some((r) => r.code === SCREENING_CODES.COLD_CHAIN_NOT_ACCEPTED)).toBe(true);
    });

    test('rejects cold-chain by refrigerated storage condition', () => {
      const refrigeratedMed = {
        ...validBaseMedicine,
        storageCondition: STORAGE_CONDITION.REFRIGERATED,
      };

      const result = screenMedicine(refrigeratedMed, { now: referenceNow });
      expect(result.status).toBe('rejected');
      expect(result.reasons.some((r) => r.code === SCREENING_CODES.COLD_CHAIN_NOT_ACCEPTED)).toBe(true);
    });

    test('rejects controlled substance by keyword (e.g. Tramadol, Morphine)', () => {
      const tramadolMed = {
        ...validBaseMedicine,
        name: 'Tramadol Hydrochloride 50mg',
      };

      const result = screenMedicine(tramadolMed, { now: referenceNow });
      expect(result.status).toBe('rejected');
      expect(result.reasons.some((r) => r.code === SCREENING_CODES.CONTROLLED_SUBSTANCE)).toBe(true);
    });

    test('rejects bad storage condition (exposed to heat/moisture)', () => {
      const damagedStorageMed = {
        ...validBaseMedicine,
        storageCondition: STORAGE_CONDITION.EXPOSED_HEAT_OR_MOISTURE,
      };

      const result = screenMedicine(damagedStorageMed, { now: referenceNow });
      expect(result.status).toBe('rejected');
      expect(result.reasons.some((r) => r.code === SCREENING_CODES.BAD_STORAGE)).toBe(true);
    });

    test('rejects unreadable or missing batch number', () => {
      const badBatchMed = {
        ...validBaseMedicine,
        batchNumber: 'AB', // <3 chars
      };

      const result = screenMedicine(badBatchMed, { now: referenceNow });
      expect(result.status).toBe('rejected');
      expect(result.reasons.some((r) => r.code === SCREENING_CODES.UNREADABLE_BATCH)).toBe(true);
    });

    test('rejects item without photos', () => {
      const noPhotoMed = {
        ...validBaseMedicine,
        photos: [],
      };

      const result = screenMedicine(noPhotoMed, { now: referenceNow });
      expect(result.status).toBe('rejected');
      expect(result.reasons.some((r) => r.code === SCREENING_CODES.MISSING_PHOTO)).toBe(true);
    });

    test('collects ALL violation reasons together without early exit', () => {
      const multiViolationMed = {
        name: 'Insulin Tramadol Mix',
        batchNumber: '', // Unreadable batch
        expiryDate: '2020-01', // Expired
        medicineType: MEDICINE_TYPE.INJECTION, // Injection
        packagingCondition: PACKAGING_CONDITION.OPENED, // Not sealed
        storageCondition: STORAGE_CONDITION.EXPOSED_HEAT_OR_MOISTURE, // Bad storage
        photos: [], // Missing photo
      };

      const result = screenMedicine(multiViolationMed, { now: referenceNow });
      expect(result.status).toBe('rejected');
      // Should flag at least 6 separate rule violations
      expect(result.reasons.length).toBeGreaterThanOrEqual(6);
      const codes = result.reasons.map((r) => r.code);
      expect(codes).toContain(SCREENING_CODES.EXPIRED);
      expect(codes).toContain(SCREENING_CODES.PACKAGING_NOT_SEALED);
      expect(codes).toContain(SCREENING_CODES.INJECTION_NOT_ACCEPTED);
      expect(codes).toContain(SCREENING_CODES.COLD_CHAIN_NOT_ACCEPTED);
      expect(codes).toContain(SCREENING_CODES.CONTROLLED_SUBSTANCE);
      expect(codes).toContain(SCREENING_CODES.BAD_STORAGE);
      expect(codes).toContain(SCREENING_CODES.UNREADABLE_BATCH);
      expect(codes).toContain(SCREENING_CODES.MISSING_PHOTO);
    });
  });
});

