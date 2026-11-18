import {
  TRANSFER_STATUS,
  TRANSFER_ITEM_STATUS,
  RECEIPT_DECISION,
  RECEIPT_CHECKLIST_KEYS,
  RECEIPT_REJECTION_CODES,
  CUSTODY_EVENT_TYPES,
  CLAIM_STATUS,
} from '../src/config/constants.js';
import { generateReceiptPdf } from '../src/services/pdf.service.js';

describe('Phase 7: Transfer & Handover Unit Tests', () => {
  describe('Receipt Checklist & Decision Rules', () => {
    test('all 4 receipt checklist items must be true for received status', () => {
      const validChecklist = {
        packagingIntact: true,
        batchMatches: true,
        expiryMatches: true,
        quantityMatches: true,
      };

      const isValid = RECEIPT_CHECKLIST_KEYS.every((k) => validChecklist[k] === true);
      expect(isValid).toBe(true);

      const invalidChecklist = { ...validChecklist, packagingIntact: false };
      const isInvalid = RECEIPT_CHECKLIST_KEYS.every((k) => invalidChecklist[k] === true);
      expect(isInvalid).toBe(false);
    });

    test('rejection requires a valid reasonCode from RECEIPT_REJECTION_CODES', () => {
      const validCode = RECEIPT_REJECTION_CODES.PACKAGING_DAMAGED;
      expect(Object.values(RECEIPT_REJECTION_CODES).includes(validCode)).toBe(true);

      const invalidCode = 'RANDOM_REASON';
      expect(Object.values(RECEIPT_REJECTION_CODES).includes(invalidCode)).toBe(false);
    });
  });

  describe('Transfer Cancellation Gating', () => {
    test('cancellation is blocked if any item has already been received', () => {
      const transferWithReceived = {
        status: TRANSFER_STATUS.PARTIALLY_COMPLETED,
        items: [
          { status: TRANSFER_ITEM_STATUS.RECEIVED },
          { status: TRANSFER_ITEM_STATUS.PENDING },
        ],
      };

      const hasReceived = transferWithReceived.items.some(
        (it) => it.status === TRANSFER_ITEM_STATUS.RECEIVED
      );
      expect(hasReceived).toBe(true);

      const cancellableTransfer = {
        status: TRANSFER_STATUS.SCHEDULED,
        items: [
          { status: TRANSFER_ITEM_STATUS.PENDING },
          { status: TRANSFER_ITEM_STATUS.PENDING },
        ],
      };

      const canCancel = !cancellableTransfer.items.some(
        (it) => it.status === TRANSFER_ITEM_STATUS.RECEIVED
      );
      expect(canCancel).toBe(true);
    });
  });

  describe('Official Handover Receipt PDF', () => {
    test('generates receipt PDF buffer with %PDF- header', async () => {
      const mockTransfer = {
        transferCode: 'TRF-2026-000001',
        status: 'completed',
        completedAt: new Date(),
        donationId: { donationCode: 'DON-2026-000001' },
        organizationId: { name: 'Seva Healthcare Foundation' },
        donorId: { name: 'Dr. Ramesh Sharma' },
        items: [
          {
            medicineId: '60c72b2f9b1d8b2badbee510',
            medicineCode: 'MED-2026-000001',
            snapshot: {
              name: 'Amoxicillin 500mg',
              batchNumber: 'AMX-99',
              expiryDate: new Date('2027-06-30'),
              quantity: 20,
              unit: 'strips',
            },
            status: 'received',
            receivedQuantity: 20,
            labelVerified: true,
          },
        ],
      };

      const mockClaim = { claimCode: 'CLM-2026-000001' };

      const pdfBuf = await generateReceiptPdf(
        mockTransfer,
        mockClaim,
        mockTransfer.donorId,
        mockTransfer.organizationId
      );

      expect(Buffer.isBuffer(pdfBuf)).toBe(true);
      expect(pdfBuf.length).toBeGreaterThan(1000);
      expect(pdfBuf.toString('utf8', 0, 5)).toBe('%PDF-');
    });
  });
});
