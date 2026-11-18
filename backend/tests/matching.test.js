import {
  createRequirementSchema,
  updateRequirementSchema,
  closeRequirementSchema,
  createClaimSchema,
  claimAcceptSchema,
  claimDeclineSchema,
  claimCancelSchema,
  nearbyQuerySchema,
} from '../src/validators/matching.validator.js';

describe('Phase 6: Matching & Requirement Compliance Validator Tests', () => {
  describe('createRequirementSchema Compliance Screening', () => {
    test('Rejects controlled substances (e.g. Tramadol, Morphine, Alprazolam)', () => {
      const result = createRequirementSchema.safeParse({
        medicineName: 'Tramadol 50mg Tablets',
        quantityNeeded: 50,
        unit: 'strip',
        urgency: 'urgent',
      });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('controlled substances or narcotics');
    });

    test('Rejects cold-chain medications (e.g. Insulin, Vaccines)', () => {
      const result = createRequirementSchema.safeParse({
        medicineName: 'Human Regular Insulin 100IU',
        quantityNeeded: 10,
        unit: 'vial',
        urgency: 'urgent',
      });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('Cold-chain items');
    });

    test('Rejects injections and infusions', () => {
      const result = createRequirementSchema.safeParse({
        medicineName: 'Ceftriaxone Injection 1g',
        quantityNeeded: 20,
        unit: 'vial',
        urgency: 'urgent',
      });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('Injections and intravenous formulations');
    });

    test('Rejects non-compliant genericName when medicineName is generic', () => {
      const result = createRequirementSchema.safeParse({
        medicineName: 'Pain Relief Medicine',
        genericName: 'Fentanyl',
        quantityNeeded: 10,
        unit: 'strip',
        urgency: 'routine',
      });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('controlled substances or narcotics');
    });

    test('Rejects past neededBy date', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);

      const result = createRequirementSchema.safeParse({
        medicineName: 'Amoxicillin 500mg',
        quantityNeeded: 30,
        unit: 'strip',
        urgency: 'routine',
        neededBy: yesterday.toISOString(),
      });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('Needed-by date must be today or in the future');
    });

    test('Accepts valid standard oral medication requirement', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const result = createRequirementSchema.safeParse({
        medicineName: 'Metformin 500mg',
        genericName: 'Metformin Hydrochloride',
        quantityNeeded: 100,
        unit: 'strip',
        urgency: 'routine',
        description: 'Needed for community diabetes clinic patients',
        neededBy: futureDate.toISOString(),
      });
      expect(result.success).toBe(true);
      expect(result.data.medicineName).toBe('Metformin 500mg');
      expect(result.data.quantityNeeded).toBe(100);
    });
  });

  describe('nearbyQuerySchema Radius & Bounds', () => {
    test('Accepts valid Indian coordinates and allowed radius (5, 10, 20 km)', () => {
      const valid5 = nearbyQuerySchema.safeParse({ lat: 19.076, lng: 72.8777, radiusKm: 5 });
      expect(valid5.success).toBe(true);

      const valid10 = nearbyQuerySchema.safeParse({ lat: 19.076, lng: 72.8777, radiusKm: 10 });
      expect(valid10.success).toBe(true);

      const valid20 = nearbyQuerySchema.safeParse({ lat: 19.076, lng: 72.8777, radiusKm: 20 });
      expect(valid20.success).toBe(true);
    });

    test('Rejects arbitrary or unsupported radius values (e.g. 15, 50 km)', () => {
      const result = nearbyQuerySchema.safeParse({ lat: 19.076, lng: 72.8777, radiusKm: 15 });
      expect(result.success).toBe(false);
      expect(result.error.errors[0].message).toContain('Radius must be one of: 5, 10, 20 km');
    });

    test('Rejects coordinates outside India bounds', () => {
      const london = nearbyQuerySchema.safeParse({ lat: 51.5074, lng: -0.1278 });
      expect(london.success).toBe(false);
    });
  });

  describe('claimSchemas', () => {
    test('createClaimSchema validates ObjectId formats and minimum 1 item', () => {
      const invalid = createClaimSchema.safeParse({
        donationId: 'not-an-id',
        medicineIds: [],
      });
      expect(invalid.success).toBe(false);

      const valid = createClaimSchema.safeParse({
        donationId: '507f1f77bcf86cd799439011',
        medicineIds: ['507f1f77bcf86cd799439012'],
        message: 'We can collect this tomorrow morning',
      });
      expect(valid.success).toBe(true);
    });

    test('claimDeclineSchema requires minimum 5 character reason', () => {
      const tooShort = claimDeclineSchema.safeParse({ reason: 'No' });
      expect(tooShort.success).toBe(false);

      const valid = claimDeclineSchema.safeParse({ reason: 'Stock already fulfilled elsewhere' });
      expect(valid.success).toBe(true);
    });

    test('claimCancelSchema requires minimum 10 character reason', () => {
      const tooShort = claimCancelSchema.safeParse({ reason: 'Cancel' });
      expect(tooShort.success).toBe(false);

      const valid = claimCancelSchema.safeParse({
        reason: 'Unable to schedule pickup due to vehicle breakdown',
      });
      expect(valid.success).toBe(true);
    });
  });
});
