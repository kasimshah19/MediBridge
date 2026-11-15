import { DateTime } from 'luxon';

export const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns a Luxon DateTime in Asia/Kolkata.
 *
 * @param {Date|string|number} [date] - Optional date; defaults to now.
 * @returns {DateTime}
 */
export const nowIST = (date) => {
  if (!date) {
    return DateTime.now().setZone(TIMEZONE);
  }
  if (date instanceof Date) {
    return DateTime.fromJSDate(date).setZone(TIMEZONE);
  }
  if (typeof date === 'string') {
    return DateTime.fromISO(date).setZone(TIMEZONE);
  }
  if (typeof date === 'number') {
    return DateTime.fromMillis(date).setZone(TIMEZONE);
  }
  return DateTime.now().setZone(TIMEZONE);
};

/**
 * Returns a JS Date representing the start of day (00:00:00.000) in Asia/Kolkata.
 *
 * @param {Date|string} [date]
 * @returns {Date}
 */
export const startOfDayIST = (date) => {
  return nowIST(date).startOf('day').toJSDate();
};

/**
 * Calculates calendar days between two dates in Asia/Kolkata time zone.
 * (to - from) in whole days.
 *
 * e.g. from = today 14:00, to = today 23:59 -> 0
 * e.g. from = today 14:00, to = tomorrow 23:59 -> 1
 * e.g. from = today 14:00, to = yesterday 23:59 -> -1
 *
 * @param {Date|string} from
 * @param {Date|string} to
 * @returns {number}
 */
export const calendarDaysBetweenIST = (from, to) => {
  const dtFrom = nowIST(from).startOf('day');
  const dtTo = nowIST(to).startOf('day');
  return Math.round(dtTo.diff(dtFrom, 'days').days);
};

/**
 * Returns a JS Date representing the exact last millisecond of a given month
 * in Asia/Kolkata (23:59:59.999 IST).
 *
 * @param {number} year
 * @param {number} month - 1-12
 * @returns {Date}
 */
export const endOfMonthIST = (year, month) => {
  return DateTime.fromObject({ year, month }, { zone: TIMEZONE })
    .endOf('month')
    .toJSDate();
};

/**
 * Normalizes an expiry date to the exact last millisecond of that month
 * in Asia/Kolkata (UTC+05:30).
 *
 * @param {string|Date} input - "YYYY-MM", "MM/YYYY", ISO date, or Date object
 * @returns {Date|null}
 */
export const normalizeExpiryDate = (input) => {
  if (!input) return null;

  let year;
  let month;

  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d{4}-\d{2}$/.test(trimmed)) {
      const [y, m] = trimmed.split('-').map(Number);
      year = y;
      month = m;
    } else if (/^\d{1,2}\/\d{4}$/.test(trimmed)) {
      const [m, y] = trimmed.split('/').map(Number);
      year = y;
      month = m;
    } else {
      const dt = DateTime.fromISO(trimmed).setZone(TIMEZONE);
      if (!dt.isValid) {
        const jsDate = new Date(trimmed);
        if (isNaN(jsDate.getTime())) return null;
        const fallbackDt = DateTime.fromJSDate(jsDate).setZone(TIMEZONE);
        year = fallbackDt.year;
        month = fallbackDt.month;
      } else {
        year = dt.year;
        month = dt.month;
      }
    }
  } else if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    const dt = DateTime.fromJSDate(input).setZone(TIMEZONE);
    year = dt.year;
    month = dt.month;
  } else {
    return null;
  }

  if (!year || !month || month < 1 || month > 12) return null;
  return endOfMonthIST(year, month);
};

