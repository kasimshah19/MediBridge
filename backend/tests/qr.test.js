import {
  signMedicineToken,
  verifyMedicineToken,
  buildVerifyUrl,
  generateQrPng,
  generateQrSvg,
  generateHandoverToken,
  hashHandoverToken,
  verifyHandoverToken,
} from '../src/services/qr.service.js';
import { generateLabelsPdf } from '../src/services/pdf.service.js';

describe('Phase 7: QR Service Unit Tests', () => {
  describe('Medicine QR Security Tokens', () => {
    const medicineId = 'MED-2026-000001';
    const issuedAt = new Date('2026-11-18T10:00:00.000Z');

    test('signs medicine token and verifies successfully with correct medicineId', () => {
      const token = signMedicineToken(medicineId, issuedAt);
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThanOrEqual(16);

      const isValid = verifyMedicineToken(token, medicineId, issuedAt);
      expect(isValid).toBe(true);
    });

    test('rejects tampered or modified token string', () => {
      const token = signMedicineToken(medicineId, issuedAt);
      const tampered = token.slice(0, -1) + (token.slice(-1) === 'A' ? 'B' : 'A');

      expect(verifyMedicineToken(tampered, medicineId, issuedAt)).toBe(false);
    });

    test('rejects token checked against different medicineId', () => {
      const token = signMedicineToken(medicineId, issuedAt);
      expect(verifyMedicineToken(token, 'MED-2026-999999', issuedAt)).toBe(false);
    });

    test('rejects null or empty token input safely without throwing', () => {
      expect(verifyMedicineToken(null, medicineId)).toBe(false);
      expect(verifyMedicineToken('', medicineId)).toBe(false);
      expect(verifyMedicineToken('short', medicineId)).toBe(false);
    });

    test('builds correctly formatted public verify URL', () => {
      const url = buildVerifyUrl(medicineId);
      expect(url).toContain(`/verify/${medicineId}?t=`);
      expect(url.startsWith('http')).toBe(true);
    });
  });

  describe('QR Rendering (PNG & SVG)', () => {
    test('generates valid PNG QR buffer', async () => {
      const testUrl = 'https://medibridge.org/verify/MED-2026-000001?t=TEST_TOKEN';
      const buf = await generateQrPng(testUrl, { width: 200 });

      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.length).toBeGreaterThan(100);
      // PNG header bytes: 0x89 0x50 0x4E 0x47
      expect(buf[0]).toBe(0x89);
      expect(buf[1]).toBe(0x50);
      expect(buf[2]).toBe(0x4e);
      expect(buf[3]).toBe(0x47);
    });

    test('generates valid SVG QR string', async () => {
      const testUrl = 'https://medibridge.org/verify/MED-2026-000001?t=TEST_TOKEN';
      const svg = await generateQrSvg(testUrl);

      expect(typeof svg).toBe('string');
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
    });
  });

  describe('Handover Pass Token Generation & Verification', () => {
    test('generates 10-char unambiguous token formatted with hyphen (XXXXX-XXXXX)', () => {
      const { token, hash } = generateHandoverToken();
      expect(token).toMatch(/^[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}-[23456789ABCDEFGHJKLMNPQRSTUVWXYZ]{5}$/);
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64);
    });

    test('hashes and verifies handover token correctly ignoring whitespace & case', () => {
      const { token, hash } = generateHandoverToken();

      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 hex string

      // Verify exact token
      expect(verifyHandoverToken(token, hash)).toBe(true);

      // Verify lowercase without hyphen
      const unformatted = token.replace('-', '').toLowerCase();
      expect(verifyHandoverToken(unformatted, hash)).toBe(true);

      // Reject incorrect token
      expect(verifyHandoverToken('WRONG-TOKEN', hash)).toBe(false);
    });
  });

  describe('Printable PDF Labels Generation', () => {
    test('generates valid A4 PDF buffer with %PDF- header', async () => {
      const donation = {
        donationCode: 'DON-2026-000001',
      };
      const items = [
        {
          medicineId: 'MED-2026-000001',
          name: 'Paracetamol 500mg',
          genericName: 'Paracetamol',
          batchNumber: 'BATCH-001',
          expiryDate: new Date('2027-12-31'),
          quantity: 10,
          unit: 'strips',
          daysLeft: 400,
        },
      ];

      const pdfBuf = await generateLabelsPdf(donation, items);
      expect(Buffer.isBuffer(pdfBuf)).toBe(true);
      expect(pdfBuf.length).toBeGreaterThan(1000);
      // PDF magic bytes %PDF-
      const header = pdfBuf.toString('utf8', 0, 5);
      expect(header).toBe('%PDF-');
    });
  });
});
