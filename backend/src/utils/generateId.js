import Counter from '../models/Counter.js';

/**
 * Generate atomic sequential IDs using Counter model with year partition.
 * Format: PREFIX-YYYY-000001 (6 digits zero-padded).
 *
 * @param {string} prefix - 'DON' or 'MED'
 * @param {import('mongoose').ClientSession} [session] - Optional Mongoose transaction session
 * @returns {Promise<string>} Generated sequential code
 */
export const generateSequentialId = async (prefix, session = null) => {
  const year = new Date().getFullYear();
  const counterKey = `${prefix}-${year}`;

  const options = { new: true, upsert: true, setDefaultsOnInsert: true };
  if (session) {
    options.session = session;
  }

  const counter = await Counter.findOneAndUpdate(
    { key: counterKey },
    { $inc: { seq: 1 } },
    options
  );

  const paddedSeq = String(counter.seq).padStart(6, '0');
  return `${prefix}-${year}-${paddedSeq}`;
};

/**
 * Generate a unique donation code: DON-YYYY-000001
 * @param {import('mongoose').ClientSession} [session]
 */
export const generateDonationCode = async (session = null) => {
  return generateSequentialId('DON', session);
};

/**
 * Generate a unique medicine inventory ID: MED-YYYY-000001
 * @param {import('mongoose').ClientSession} [session]
 */
export const generateMedicineId = async (session = null) => {
  return generateSequentialId('MED', session);
};

/**
 * Generate a unique claim match code: CLM-YYYY-000001
 * @param {import('mongoose').ClientSession} [session]
 */
export const generateClaimCode = async (session = null) => {
  return generateSequentialId('CLM', session);
};

/**
 * Generate a unique transfer handover code: TRF-YYYY-000001
 * @param {import('mongoose').ClientSession} [session]
 */
export const generateTransferCode = async (session = null) => {
  return generateSequentialId('TRF', session);
};

export default {
  generateSequentialId,
  generateDonationCode,
  generateMedicineId,
  generateClaimCode,
  generateTransferCode,
};
