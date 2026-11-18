import crypto from 'crypto';
import qrcode from 'qrcode';
import env from '../config/env.js';

/**
 * Unambiguous alphabet excluding easily confused characters:
 * Omits 0, O, 1, I, l
 */
const UNAMBIGUOUS_CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

/**
 * Generates an HMAC-SHA256 signature token for a medicine verification URL.
 * Base64url encoded and truncated to 22 characters.
 *
 * @param {string} medicineId - Public medicine ID (e.g. MED-2026-000001)
 * @returns {string} 22-char token
 */
export const signMedicineToken = (medicineId) => {
  if (!medicineId || typeof medicineId !== 'string') {
    throw new Error('Valid medicineId required for token signing');
  }

  const hmac = crypto.createHmac('sha256', env.QR_SIGNING_SECRET);
  hmac.update(medicineId.trim());
  const token = hmac.digest('base64url').slice(0, 22);
  return token;
};

/**
 * Verifies a medicine token in constant time to prevent timing attacks.
 *
 * @param {string} medicineId
 * @param {string} token
 * @returns {boolean} True if token is authentic
 */
export const verifyMedicineToken = (a, b) => {
  if (!a || !b || typeof a !== 'string' || typeof b !== 'string') {
    return false;
  }

  try {
    // Try a as token, b as medicineId
    const expectedFromB = signMedicineToken(b);
    if (
      a.length === expectedFromB.length &&
      crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(expectedFromB, 'utf8'))
    ) {
      return true;
    }
  } catch {}

  try {
    // Try b as token, a as medicineId
    const expectedFromA = signMedicineToken(a);
    if (
      b.length === expectedFromA.length &&
      crypto.timingSafeEqual(Buffer.from(b, 'utf8'), Buffer.from(expectedFromA, 'utf8'))
    ) {
      return true;
    }
  } catch {}

  return false;
};

/**
 * Builds the full public verification URL for a medicine QR code.
 *
 * @param {string} medicineId
 * @returns {string} Fully qualified verify URL
 */
export const buildVerifyUrl = (medicineId) => {
  const token = signMedicineToken(medicineId);
  const clientBase = (env.CLIENT_URL || 'http://localhost:5173').replace(/\/$/, '');
  return `${clientBase}/verify/${medicineId}?t=${token}`;
};

/**
 * Generates a PNG QR code buffer.
 *
 * @param {string} text - URL or text payload
 * @param {object} [options]
 * @returns {Promise<Buffer>}
 */
export const generateQrPng = async (text, options = {}) => {
  const opts = {
    errorCorrectionLevel: 'M',
    type: 'png',
    margin: 2,
    width: options.width || 300,
    color: {
      dark: options.darkColor || '#000000',
      light: options.lightColor || '#ffffff',
    },
    ...options,
  };

  return qrcode.toBuffer(text, opts);
};

/**
 * Generates an SVG QR code string.
 *
 * @param {string} text - URL or text payload
 * @param {object} [options]
 * @returns {Promise<string>}
 */
export const generateQrSvg = async (text, options = {}) => {
  const opts = {
    errorCorrectionLevel: 'M',
    type: 'svg',
    margin: 2,
    width: options.width || 300,
    color: {
      dark: options.darkColor || '#000000',
      light: options.lightColor || '#ffffff',
    },
    ...options,
  };

  return qrcode.toString(text, opts);
};

/**
 * Generates a random handover token for physical custody exchange.
 * Formats as XXXXX-XXXXX (10 unambiguous characters with hyphen for human readability).
 *
 * @returns {{ token: string, hash: string }} Plaintext token to display and SHA-256 hash to store
 */
export const generateHandoverToken = () => {
  const bytes = crypto.randomBytes(10);
  let rawChars = '';
  for (let i = 0; i < 10; i++) {
    rawChars += UNAMBIGUOUS_CHARS[bytes[i] % UNAMBIGUOUS_CHARS.length];
  }

  const token = `${rawChars.slice(0, 5)}-${rawChars.slice(5, 10)}`;
  const hash = hashHandoverToken(token);

  return { token, hash };
};

/**
 * Computes SHA-256 hex hash of a handover token (normalizes uppercase and removes hyphen).
 *
 * @param {string} token
 * @returns {string} Hex hash
 */
export const hashHandoverToken = (token) => {
  if (!token || typeof token !== 'string') return '';
  const normalized = token.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  return crypto.createHash('sha256').update(normalized).digest('hex');
};

/**
 * Verifies a provided handover token against a stored SHA-256 hash using timing-safe comparison.
 *
 * @param {string} providedToken
 * @param {string} storedHash
 * @returns {boolean}
 */
export const verifyHandoverToken = (providedToken, storedHash) => {
  if (!providedToken || !storedHash || typeof providedToken !== 'string') {
    return false;
  }

  try {
    const providedHash = hashHandoverToken(providedToken);
    const providedBuf = Buffer.from(providedHash, 'hex');
    const storedBuf = Buffer.from(storedHash, 'hex');

    if (providedBuf.length !== storedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(providedBuf, storedBuf);
  } catch {
    return false;
  }
};

export default {
  signMedicineToken,
  verifyMedicineToken,
  buildVerifyUrl,
  generateQrPng,
  generateQrSvg,
  generateHandoverToken,
  hashHandoverToken,
  verifyHandoverToken,
};
