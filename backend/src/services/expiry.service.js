import { PRIORITY_LEVELS } from '../config/constants.js';

/**
 * Normalizes an expiry date to the exact LAST millisecond of that month
 * in Asia/Kolkata time zone (UTC+05:30).
 *
 * e.g. "2026-11" or new Date("2026-11-15") -> 2026-11-30T23:59:59.999+05:30 (18:29:59.999Z)
 *
 * @param {string|Date} input - "YYYY-MM", "MM/YYYY", ISO date string, or Date object
 * @returns {Date} Normalized Date object
 */
export const normalizeExpiryDate = (input) => {
  if (!input) return null;

  let year;
  let month; // 1-12

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      // YYYY-MM
      const [y, m] = trimmed.split('-').map(Number);
      year = y;
      month = m;
    } else if (/^\d{1,2}\/\d{4}$/.test(trimmed)) {
      // MM/YYYY
      const [m, y] = trimmed.split('/').map(Number);
      year = y;
      month = m;
    } else {
      // Try generic Date parsing
      const parsed = new Date(trimmed);
      if (isNaN(parsed.getTime())) return null;
      // Get year and month in IST (+05:30)
      const istOffsetMs = 5.5 * 60 * 60 * 1000;
      const istDate = new Date(parsed.getTime() + istOffsetMs);
      year = istDate.getUTCFullYear();
      month = istDate.getUTCMonth() + 1;
    }
  } else if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    const istOffsetMs = 5.5 * 60 * 60 * 1000;
    const istDate = new Date(input.getTime() + istOffsetMs);
    year = istDate.getUTCFullYear();
    month = istDate.getUTCMonth() + 1;
  } else {
    return null;
  }

  // Last day of month: day 0 of month + 1
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();

  // Create date at 23:59:59.999 IST
  // In UTC: 23:59:59.999 - 05:30 = 18:29:59.999
  const utcDate = new Date(Date.UTC(year, month - 1, lastDay, 18, 29, 59, 999));
  return utcDate;
};

/**
 * Calculates remaining days between an expiry date and a reference date (default: now).
 * Uses whole days.
 *
 * @param {Date|string} expiryDate
 * @param {Date|string} [referenceDate=new Date()]
 * @returns {number} Days remaining (can be negative if expired)
 */
export const calculateRemainingDays = (expiryDate, referenceDate = new Date()) => {
  const expiry = expiryDate instanceof Date ? expiryDate : new Date(expiryDate);
  const ref = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);

  if (isNaN(expiry.getTime()) || isNaN(ref.getTime())) return 0;

  const diffMs = expiry.getTime() - ref.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

/**
 * Calculates medicine priority based on remaining days of shelf life.
 *
 * > 180 days       -> normal
 * 91 to 180 days   -> medium
 * 31 to 90 days    -> high
 * <= 30 days       -> critical
 *
 * @param {Date|string} expiryDate
 * @param {Date|string} [referenceDate=new Date()]
 * @returns {'normal'|'medium'|'high'|'critical'}
 */
export const calculatePriority = (expiryDate, referenceDate = new Date()) => {
  const remainingDays = calculateRemainingDays(expiryDate, referenceDate);

  if (remainingDays > 180) {
    return PRIORITY_LEVELS.NORMAL;
  }
  if (remainingDays >= 91) {
    return PRIORITY_LEVELS.MEDIUM;
  }
  if (remainingDays >= 31) {
    return PRIORITY_LEVELS.HIGH;
  }
  return PRIORITY_LEVELS.CRITICAL;
};

export default {
  normalizeExpiryDate,
  calculateRemainingDays,
  calculatePriority,
};
