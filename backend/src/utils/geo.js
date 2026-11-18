import { calendarDaysBetweenIST } from './dates.js';
import { REQUIREMENT_URGENCY } from '../config/constants.js';

/**
 * Calculates great-circle distance between two geographic coordinates using the Haversine formula.
 *
 * @param {{ lat: number, lng: number } | [number, number]} a - First coordinate
 * @param {{ lat: number, lng: number } | [number, number]} b - Second coordinate
 * @returns {number} Distance in kilometers rounded to 1 decimal place.
 */
export const haversineKm = (a, b) => {
  if (!a || !b) return 0;

  const lat1 = a.lat !== undefined ? a.lat : a[1];
  const lon1 = a.lng !== undefined ? a.lng : a[0];
  const lat2 = b.lat !== undefined ? b.lat : b[1];
  const lon2 = b.lng !== undefined ? b.lng : b[0];

  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') {
    return 0;
  }

  // Same coordinates return 0 directly
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const rLat1 = (lat1 * Math.PI) / 180;
  const rLat2 = (lat2 * Math.PI) / 180;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const h = sinDLat * sinDLat + Math.cos(rLat1) * Math.cos(rLat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  const distance = R * c;

  return Math.round(distance * 10) / 10;
};

/**
 * Rounds geographic coordinates to approximate grid precision (default 2 decimals ~1.1 km).
 * Used to protect donor privacy before a claim is accepted.
 *
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} [decimals=2] - Decimal places
 * @returns {{ lat: number, lng: number }}
 */
export const roundCoordinate = (lat, lng, decimals = 2) => {
  const factor = Math.pow(10, decimals);
  return {
    lat: Math.round(lat * factor) / factor,
    lng: Math.round(lng * factor) / factor,
  };
};

/**
 * Validates whether latitude and longitude are within mainland India bounds.
 * Latitude: 6° to 38°, Longitude: 68° to 98°.
 *
 * @param {number} lat
 * @param {number} lng
 * @returns {boolean}
 */
export const isWithinIndia = (lat, lng) => {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= 6 &&
    lat <= 38 &&
    lng >= 68 &&
    lng <= 98
  );
};

/**
 * Normalizes medicine names by stripping dosage strengths (e.g. "500mg", "650 mg", "10ml")
 * and punctuation to ensure robust matching against requirements.
 *
 * @param {string} name
 * @returns {string}
 */
export const normalizeMedicineName = (name = '') => {
  if (!name || typeof name !== 'string') return '';
  return name
    .toLowerCase()
    .replace(/\b\d+(\.\d+)?\s*(mg|g|mcg|ml|l|iu|%)\b/gi, '')
    .replace(/\b(tablets?|capsules?|vials?|pills?|injections?|suspension)\b/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Extracts non-empty tokens from a string.
 * @param {string} str
 * @returns {Set<string>}
 */
const getTokens = (str) => {
  const normalized = normalizeMedicineName(str);
  return new Set(normalized.split(' ').filter((t) => t.length > 2));
};

/**
 * Multi-factor matching score between a medicine item and an NGO requirement (0 to 100).
 *
 * Score breakdown:
 * - Name Match: up to 50 (exact normalized name or genericName = 50, token overlap >= 50% = 30)
 * - Urgency: up to 20 (urgent = 20, soon = 12, routine = 5)
 * - Distance: up to 15 (linear: 0 km = 15, maxRadiusKm = 0)
 * - Shelf-life: up to 15 (> 180 days = 15, 91-180 days = 10, 31-90 days = 5, <= 30 days = 0)
 *
 * @param {Object} item - Medicine item
 * @param {Object} [requirement] - Optional NGO requirement
 * @param {Object} [options]
 * @param {number} [options.distanceKm=0]
 * @param {number} [options.maxRadiusKm=20]
 * @param {Date} [options.now=new Date()]
 * @returns {{ score: number, reasons: string[] }}
 */
export const scoreMatch = (
  item = {},
  requirement = null,
  { distanceKm = 0, maxRadiusKm = 20, now = new Date() } = {}
) => {
  let score = 0;
  const reasons = [];

  if (!item) return { score: 0, reasons: [] };

  // 1. Name Matching (up to 50 pts)
  if (requirement) {
    const itemNameNorm = normalizeMedicineName(item.name);
    const itemGenericNorm = normalizeMedicineName(item.genericName || '');
    const reqNameNorm = normalizeMedicineName(requirement.medicineName);
    const reqGenericNorm = normalizeMedicineName(requirement.genericName || '');

    const isExactName =
      (itemNameNorm && reqNameNorm && itemNameNorm === reqNameNorm) ||
      (itemGenericNorm && reqGenericNorm && itemGenericNorm === reqGenericNorm) ||
      (itemNameNorm && reqGenericNorm && itemNameNorm === reqGenericNorm) ||
      (itemGenericNorm && reqNameNorm && itemGenericNorm === reqNameNorm);

    if (isExactName) {
      score += 50;
      reasons.push(`Exact match: ${requirement.medicineName}`);
    } else {
      // Token overlap
      const itemTokens = new Set([...getTokens(item.name), ...getTokens(item.genericName || '')]);
      const reqTokens = new Set([...getTokens(requirement.medicineName), ...getTokens(requirement.genericName || '')]);

      if (itemTokens.size > 0 && reqTokens.size > 0) {
        let intersectionCount = 0;
        for (const token of reqTokens) {
          if (itemTokens.has(token)) intersectionCount++;
        }
        const overlapRatio = intersectionCount / reqTokens.size;
        if (overlapRatio >= 0.5) {
          score += 30;
          reasons.push(`Partial match: ${requirement.medicineName}`);
        }
      }
    }

    // 2. Urgency weighting (up to 20 pts)
    const urg = requirement.urgency || REQUIREMENT_URGENCY.ROUTINE;
    if (urg === REQUIREMENT_URGENCY.URGENT) {
      score += 20;
      reasons.push('High priority: Urgent NGO requirement');
    } else if (urg === REQUIREMENT_URGENCY.SOON) {
      score += 12;
      reasons.push('Needed soon by NGO');
    } else {
      score += 5;
    }
  }

  // 3. Proximity / Distance weighting (up to 15 pts)
  const dKm = Math.max(0, distanceKm);
  const maxR = Math.max(1, maxRadiusKm);
  if (dKm <= maxR) {
    const distPoints = Math.max(0, Math.round((1 - dKm / maxR) * 15));
    score += distPoints;
    reasons.push(`${dKm.toFixed(1)} km away`);
  }

  // 4. Remaining shelf-life weighting (up to 15 pts)
  const daysLeft =
    item.daysLeft !== undefined
      ? item.daysLeft
      : calendarDaysBetweenIST(now, item.expiryDate);
  if (daysLeft > 180) {
    score += 15;
    reasons.push(`High shelf-life (${Math.round(daysLeft / 30)} months remaining)`);
  } else if (daysLeft > 90) {
    score += 10;
    reasons.push(`Good shelf-life (${daysLeft} days remaining)`);
  } else if (daysLeft > 30) {
    score += 5;
    reasons.push(`Expiring soon (${daysLeft} days remaining)`);
  }

  // Cap score between 0 and 100
  score = Math.min(100, Math.max(0, score));

  return { score, reasons };
};

export default {
  haversineKm,
  roundCoordinate,
  isWithinIndia,
  normalizeMedicineName,
  scoreMatch,
};
