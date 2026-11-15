import {
  deriveDonationStatus,
  validateChecklist,
  validateDecisionInput,
} from '../src/services/verification.service.js';
import {
  MEDICINE_STATUS,
  DONATION_STATUS,
  VERIFICATION_DECISION,
  REJECTION_REASON_CODES,
  MORE_INFO_REQUEST_TYPES,
} from '../src/config/constants.js';

describe('Phase 5 Unit Tests: Verification Pure Rules Engine', () => {
  // ========================================================
  // 1. deriveDonationStatus tests
  // ========================================================
  describe('deriveDonationStatus(items)', () => {
    test('Empty or null items array derives REJECTED', () => {
      expect(deriveDonationStatus([])).toBe(DONATION_STATUS.REJECTED);
      expect(deriveDonationStatus(null)).toBe(DONATION_STATUS.REJECTED);
    });

    test('Any item in pending -> donation is under_verification', () => {
      expect(
        deriveDonationStatus([
          { status: MEDICINE_STATUS.PENDING },
          { status: MEDICINE_STATUS.APPROVED },
          { status: MEDICINE_STATUS.REJECTED },
        ])
      ).toBe(DONATION_STATUS.UNDER_VERIFICATION);

      expect(
        deriveDonationStatus([
          { status: MEDICINE_STATUS.MORE_INFO_REQUIRED },
          { status: MEDICINE_STATUS.PENDING },
        ])
      ).toBe(DONATION_STATUS.UNDER_VERIFICATION);
    });

    test('No pending items, but at least one more_info_required -> donation is more_info_required', () => {
      expect(
        deriveDonationStatus([
          { status: MEDICINE_STATUS.MORE_INFO_REQUIRED },
          { status: MEDICINE_STATUS.APPROVED },
          { status: MEDICINE_STATUS.REJECTED },
        ])
      ).toBe(DONATION_STATUS.MORE_INFO_REQUIRED);

      expect(
        deriveDonationStatus([
          { status: MEDICINE_STATUS.MORE_INFO_REQUIRED },
          { status: MEDICINE_STATUS.REJECTED },
        ])
      ).toBe(DONATION_STATUS.MORE_INFO_REQUIRED);
    });

    test('No pending, no more_info, at least one approved -> donation is approved', () => {
      expect(
        deriveDonationStatus([
          { status: MEDICINE_STATUS.APPROVED },
          { status: MEDICINE_STATUS.REJECTED },
        ])
      ).toBe(DONATION_STATUS.APPROVED);

      expect(
        deriveDonationStatus([
          { status: MEDICINE_STATUS.APPROVED },
          { status: MEDICINE_STATUS.APPROVED },
        ])
      ).toBe(DONATION_STATUS.APPROVED);
    });

    test('All items rejected (or expired) -> donation is rejected', () => {
      expect(
        deriveDonationStatus([
          { status: MEDICINE_STATUS.REJECTED },
          { status: MEDICINE_STATUS.REJECTED },
        ])
      ).toBe(DONATION_STATUS.REJECTED);

      expect(
        deriveDonationStatus([
          { status: MEDICINE_STATUS.REJECTED },
          { status: MEDICINE_STATUS.EXPIRED },
        ])
      ).toBe(DONATION_STATUS.REJECTED);
    });
  });

  // ========================================================
  // 2. validateChecklist tests
  // ========================================================
  describe('validateChecklist(checklist)', () => {
    const validChecklist = {
      packagingIntact: true,
      batchReadable: true,
      expiryValid: true,
      storageReliable: true,
      authenticityEstablished: true,
      policyEligible: true,
    };

    test('Returns true ONLY when all 6 points are true', () => {
      expect(validateChecklist(validChecklist)).toBe(true);
    });

    test('Returns false if any single point is false or missing', () => {
      expect(validateChecklist({ ...validChecklist, packagingIntact: false })).toBe(false);
      expect(validateChecklist({ ...validChecklist, batchReadable: false })).toBe(false);
      expect(validateChecklist({ ...validChecklist, expiryValid: false })).toBe(false);
      expect(validateChecklist({ ...validChecklist, storageReliable: false })).toBe(false);
      expect(validateChecklist({ ...validChecklist, authenticityEstablished: false })).toBe(false);
      expect(validateChecklist({ ...validChecklist, policyEligible: false })).toBe(false);
      expect(validateChecklist({})).toBe(false);
      expect(validateChecklist(null)).toBe(false);
    });
  });

  // ========================================================
  // 3. validateDecisionInput tests
  // ========================================================
  describe('validateDecisionInput(params)', () => {
    const fullChecklist = {
      packagingIntact: true,
      batchReadable: true,
      expiryValid: true,
      storageReliable: true,
      authenticityEstablished: true,
      policyEligible: true,
    };

    test('Approve succeeds when all 6 checklist items are true', () => {
      expect(() =>
        validateDecisionInput({
          decision: VERIFICATION_DECISION.APPROVED,
          checklist: fullChecklist,
        })
      ).not.toThrow();
    });

    test('Approve fails (422) if any checklist item is false', () => {
      expect(() =>
        validateDecisionInput({
          decision: VERIFICATION_DECISION.APPROVED,
          checklist: { ...fullChecklist, packagingIntact: false },
        })
      ).toThrow(/All six verification checklist criteria/);
    });

    test('Reject fails (422) without a valid reasonCode', () => {
      expect(() =>
        validateDecisionInput({
          decision: VERIFICATION_DECISION.REJECTED,
          reasonCode: null,
          reason: 'Valid clinical explanation of failure.',
        })
      ).toThrow(/A valid rejection reason code is required/);

      expect(() =>
        validateDecisionInput({
          decision: VERIFICATION_DECISION.REJECTED,
          reasonCode: 'INVALID_CODE_XYZ',
          reason: 'Valid clinical explanation of failure.',
        })
      ).toThrow(/A valid rejection reason code is required/);
    });

    test('Reject fails (422) with a note shorter than 10 characters', () => {
      expect(() =>
        validateDecisionInput({
          decision: VERIFICATION_DECISION.REJECTED,
          reasonCode: REJECTION_REASON_CODES.PACKAGING_COMPROMISED,
          reason: 'Bad pack',
        })
      ).toThrow(/Rejection note must be between 10 and 500 characters/);
    });

    test('Reject succeeds with valid reasonCode and adequate note', () => {
      expect(() =>
        validateDecisionInput({
          decision: VERIFICATION_DECISION.REJECTED,
          reasonCode: REJECTION_REASON_CODES.BATCH_UNVERIFIABLE,
          reason: 'Batch number is completely smudged and unreadable.',
        })
      ).not.toThrow();
    });

    test('More Info fails (422) without request types or with empty array', () => {
      expect(() =>
        validateDecisionInput({
          decision: VERIFICATION_DECISION.MORE_INFO_REQUESTED,
          requestedTypes: [],
          question: 'Please provide a clearer photo of the batch number.',
        })
      ).toThrow(/At least one information request type must be selected/);
    });

    test('More Info fails (422) with a question shorter than 10 characters', () => {
      expect(() =>
        validateDecisionInput({
          decision: VERIFICATION_DECISION.MORE_INFO_REQUESTED,
          requestedTypes: [MORE_INFO_REQUEST_TYPES.CLEARER_BATCH_PHOTO],
          question: 'Too short',
        })
      ).toThrow(/clarification question between 10 and 500 characters/);
    });

    test('More Info fails (422) when current round is 3 or higher (max 3 rounds)', () => {
      expect(() =>
        validateDecisionInput({
          decision: VERIFICATION_DECISION.MORE_INFO_REQUESTED,
          requestedTypes: [MORE_INFO_REQUEST_TYPES.CLEARER_BATCH_PHOTO],
          question: 'Please provide a clearer photo of the batch number.',
          currentRound: 3,
        })
      ).toThrow(/Maximum 3 clarification rounds reached/);
    });

    test('More Info succeeds on round 0, 1, or 2 with valid inputs', () => {
      expect(() =>
        validateDecisionInput({
          decision: VERIFICATION_DECISION.MORE_INFO_REQUESTED,
          requestedTypes: [MORE_INFO_REQUEST_TYPES.CLEARER_BATCH_PHOTO],
          question: 'Please provide a clearer photo of the batch number.',
          currentRound: 2,
        })
      ).not.toThrow();
    });
  });
});
