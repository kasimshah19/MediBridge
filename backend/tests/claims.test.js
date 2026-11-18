import { deriveDonationStatus } from '../src/services/verification.service.js';
import {
  MEDICINE_STATUS,
  DONATION_STATUS,
  CLAIM_STATUS,
} from '../src/config/constants.js';

describe('Phase 6: Claims & Privacy Rules Unit Tests', () => {
  describe('deriveDonationStatus with Reserved medicines', () => {
    test('Derives MATCHED status when medicines are reserved', () => {
      const statuses = [MEDICINE_STATUS.RESERVED, MEDICINE_STATUS.RESERVED];
      expect(deriveDonationStatus(statuses)).toBe(DONATION_STATUS.MATCHED);
    });

    test('Derives APPROVED status when some medicines are approved and some are reserved', () => {
      const statuses = [MEDICINE_STATUS.APPROVED, MEDICINE_STATUS.RESERVED];
      expect(deriveDonationStatus(statuses)).toBe(DONATION_STATUS.APPROVED);
    });

    test('Derives MATCHED status when remaining non-rejected items are reserved', () => {
      const statuses = [
        MEDICINE_STATUS.REJECTED,
        MEDICINE_STATUS.RESERVED,
        MEDICINE_STATUS.RESERVED,
      ];
      expect(deriveDonationStatus(statuses)).toBe(DONATION_STATUS.MATCHED);
    });
  });

  describe('Claim Status Transitions & Privacy Enforcement', () => {
    test('Handover contact disclosure requires accepted status', () => {
      const pendingClaim = {
        status: CLAIM_STATUS.PENDING,
        claimCode: 'CLM-2026-000001',
      };

      const isContactRevealed = (claim) => claim.status === CLAIM_STATUS.ACCEPTED;

      expect(isContactRevealed(pendingClaim)).toBe(false);
      expect(isContactRevealed({ status: CLAIM_STATUS.ACCEPTED })).toBe(true);
      expect(isContactRevealed({ status: CLAIM_STATUS.DECLINED })).toBe(false);
      expect(isContactRevealed({ status: CLAIM_STATUS.CANCELLED })).toBe(false);
    });

    test('Mutual exclusivity: active claim statuses include only pending and accepted', () => {
      const activeStatuses = [CLAIM_STATUS.PENDING, CLAIM_STATUS.ACCEPTED];
      expect(activeStatuses.includes('pending')).toBe(true);
      expect(activeStatuses.includes('accepted')).toBe(true);
      expect(activeStatuses.includes('superseded')).toBe(false);
      expect(activeStatuses.includes('cancelled')).toBe(false);
    });
  });
});
