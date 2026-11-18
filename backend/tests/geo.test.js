import {
  haversineKm,
  roundCoordinate,
  isWithinIndia,
  normalizeMedicineName,
  scoreMatch,
} from '../src/utils/geo.js';
import { REQUIREMENT_URGENCY } from '../src/config/constants.js';

describe('Phase 6 Unit Tests: Geospatial Calculations & Matching Score', () => {
  describe('haversineKm(a, b)', () => {
    test('Calculates accurate distance between known cities (Mumbai to Pune ~120 km)', () => {
      const mumbai = { lat: 18.922, lng: 72.8347 };
      const pune = { lat: 18.5204, lng: 73.8567 };
      const dist = haversineKm(mumbai, pune);
      expect(dist).toBeGreaterThan(110);
      expect(dist).toBeLessThan(130);
    });

    test('Accepts both { lat, lng } objects and [lng, lat] GeoJSON arrays', () => {
      const pt1Obj = { lat: 19.076, lng: 72.8777 };
      const pt2Arr = [72.8877, 19.086]; // [lng, lat]
      const dist = haversineKm(pt1Obj, pt2Arr);
      expect(dist).toBeGreaterThan(0);
      expect(typeof dist).toBe('number');
    });

    test('Identical coordinates return 0 km', () => {
      const pt = { lat: 19.076, lng: 72.8777 };
      expect(haversineKm(pt, pt)).toBe(0);
    });

    test('Invalid coordinates return 0 without throwing error', () => {
      expect(haversineKm(null, undefined)).toBe(0);
      expect(haversineKm({ lat: 'abc' }, { lat: 19 })).toBe(0);
    });
  });

  describe('roundCoordinate(lat, lng, decimals)', () => {
    test('Rounds coordinates to default 2 decimals (~1 km grid precision)', () => {
      const rounded = roundCoordinate(19.075984, 72.877655);
      expect(rounded.lat).toBe(19.08);
      expect(rounded.lng).toBe(72.88);
    });

    test('Supports custom decimal precision', () => {
      const rounded = roundCoordinate(19.075984, 72.877655, 3);
      expect(rounded.lat).toBe(19.076);
      expect(rounded.lng).toBe(72.878);
    });
  });

  describe('isWithinIndia(lat, lng)', () => {
    test('Validates coordinates within India bounds (lat: 6-38, lng: 68-98)', () => {
      expect(isWithinIndia(19.076, 72.8777)).toBe(true); // Mumbai
      expect(isWithinIndia(28.6139, 77.209)).toBe(true); // Delhi
      expect(isWithinIndia(13.0827, 80.2707)).toBe(true); // Chennai
      expect(isWithinIndia(12.9716, 77.5946)).toBe(true); // Bengaluru
    });

    test('Rejects coordinates outside India bounds', () => {
      expect(isWithinIndia(51.5074, -0.1278)).toBe(false); // London
      expect(isWithinIndia(40.7128, -74.006)).toBe(false); // New York
      expect(isWithinIndia(3.139, 101.6869)).toBe(false); // Malaysia
      expect(isWithinIndia(null, 72.8)).toBe(false);
    });
  });

  describe('normalizeMedicineName(name)', () => {
    test('Strips strengths and dosage units cleanly', () => {
      expect(normalizeMedicineName('Paracetamol 500mg')).toBe('paracetamol');
      expect(normalizeMedicineName('Amoxicillin 650 mg Capsules')).toBe('amoxicillin');
      expect(normalizeMedicineName('Cetirizine 10mg Tablets')).toBe('cetirizine');
      expect(normalizeMedicineName('Cough Syrup 100 ml')).toBe('cough syrup');
    });
  });

  describe('scoreMatch(item, requirement, options)', () => {
    const futureExpiry = new Date(Date.now() + 240 * 24 * 60 * 60 * 1000); // 8 months ahead

    test('Calculates high score for exact name match + urgent requirement + close distance', () => {
      const item = {
        name: 'Paracetamol 500mg',
        genericName: 'Paracetamol',
        expiryDate: futureExpiry,
        daysLeft: 240,
      };

      const req = {
        medicineName: 'Paracetamol 650mg',
        genericName: 'Paracetamol',
        urgency: REQUIREMENT_URGENCY.URGENT,
      };

      const result = scoreMatch(item, req, { distanceKm: 2, maxRadiusKm: 20 });
      // 50 (name) + 20 (urgent) + 14 (distance 2km) + 15 (shelf life > 180) = ~99
      expect(result.score).toBeGreaterThanOrEqual(90);
      expect(result.reasons).toEqual(
        expect.arrayContaining([
          expect.stringContaining('Exact match'),
          expect.stringContaining('High priority: Urgent NGO requirement'),
          expect.stringContaining('2.0 km away'),
        ])
      );
    });

    test('Calculates partial match score when name tokens overlap', () => {
      const item = {
        name: 'Amoxicillin and Potassium Clavulanate',
        genericName: 'Amoxicillin Clavulanic Acid',
        expiryDate: futureExpiry,
        daysLeft: 200,
      };

      const req = {
        medicineName: 'Amoxicillin 500mg',
        urgency: REQUIREMENT_URGENCY.SOON,
      };

      const result = scoreMatch(item, req, { distanceKm: 5, maxRadiusKm: 20 });
      // 30 (partial name) + 12 (soon) + 11 (distance) + 15 (shelf-life) = ~68
      expect(result.score).toBeGreaterThanOrEqual(60);
      expect(result.score).toBeLessThan(85);
      expect(result.reasons.some((r) => r.includes('Partial match'))).toBe(true);
    });

    test('Calculates distance and shelf-life score even when no requirement is provided', () => {
      const item = {
        name: 'Azithromycin 500mg',
        expiryDate: futureExpiry,
        daysLeft: 100, // good shelf-life (10 pts)
      };

      const result = scoreMatch(item, null, { distanceKm: 10, maxRadiusKm: 20 });
      // 0 (no req) + 8 (distance 10km) + 10 (shelf life 91-180) = 18
      expect(result.score).toBe(18);
    });
  });
});
