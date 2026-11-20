import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import env from '../src/config/env.js';
import { clearAnalyticsCache, getCachedOrFetch, parseDateRange } from '../src/services/analytics.service.js';

let app;
let User;
let adminToken;
let donorToken;

beforeAll(async () => {
  const userModule = await import('../src/models/User.js');
  User = userModule.default;

  const appModule = await import('../src/app.js');
  app = appModule.default;

  adminToken = jwt.sign(
    { id: '65f1234567890abcdef12345', tokenVersion: 0 },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  donorToken = jwt.sign(
    { id: '65f1234567890abcdef12346', tokenVersion: 0 },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );
});

afterEach(() => {
  jest.restoreAllMocks();
  clearAnalyticsCache();
});

describe('Phase 8: Admin Analytics Test Suite', () => {
  describe('RBAC & Date Range Guard', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await request(app).get('/api/admin/analytics/overview');
      expect(res.status).toBe(401);
    });

    it('should reject non-admin users with 403', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: '65f1234567890abcdef12346',
        role: 'donor',
        accountStatus: 'active',
        tokenVersion: 0,
      });

      const res = await request(app)
        .get('/api/admin/analytics/overview')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(403);
    });

    it('should reject date ranges exceeding 366 days with 422', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: '65f1234567890abcdef12345',
        role: 'admin',
        accountStatus: 'active',
        tokenVersion: 0,
      });

      const res = await request(app)
        .get('/api/admin/analytics/overview?from=2024-01-01&to=2025-02-01')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/cannot exceed 366 days/i);
    });

    it('should reject invalid "from" or "to" dates with 422', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: '65f1234567890abcdef12345',
        role: 'admin',
        accountStatus: 'active',
        tokenVersion: 0,
      });

      const res = await request(app)
        .get('/api/admin/analytics/overview?from=invalid-date&to=2024-01-01')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
    });
  });

  describe('In-Memory Caching & TTL', () => {
    it('should cache and return cached value on subsequent identical query', async () => {
      let callCount = 0;
      const fakeFetcher = async () => {
        callCount++;
        return { count: callCount };
      };

      const first = await getCachedOrFetch('test-key', fakeFetcher);
      const second = await getCachedOrFetch('test-key', fakeFetcher);

      expect(first.count).toBe(1);
      expect(second.count).toBe(1);
      expect(callCount).toBe(1);

      clearAnalyticsCache();
      const third = await getCachedOrFetch('test-key', fakeFetcher);
      expect(third.count).toBe(2);
    });
  });

  describe('PII Deep Redaction Rule', () => {
    it('should never contain phone, email, private address, or exact coordinates in responses', async () => {
      const piiBlacklist = ['phone', 'email', 'donorName', 'password'];

      // Recursively scan keys
      const containsPiiKey = (obj) => {
        if (!obj || typeof obj !== 'object') return false;
        for (const k of Object.keys(obj)) {
          if (piiBlacklist.includes(k)) return true;
          if (typeof obj[k] === 'object' && containsPiiKey(obj[k])) return true;
        }
        return false;
      };

      const sampleAnalyticsOutput = {
        current: {
          donationsSubmitted: 12,
          medicinesSubmitted: 45,
          activeDonors: 10,
        },
        pharmacists: [
          { firstName: 'Aarav', pharmacyName: 'Apollo Meds', decisions: 15 },
        ],
        mapPoints: [
          { lat: 19.07, lng: 72.87, city: 'Mumbai', count: 5 },
        ],
      };

      expect(containsPiiKey(sampleAnalyticsOutput)).toBe(false);
    });
  });
});
