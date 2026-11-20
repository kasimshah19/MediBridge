import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import env from '../src/config/env.js';
import { sanitizeCsvCell } from '../src/services/report.service.js';

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
});

describe('Phase 8: Admin Reports Test Suite', () => {
  describe('RBAC & Format Validation', () => {
    it('should reject non-admin users with 403', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: '65f1234567890abcdef12346',
        role: 'donor',
        accountStatus: 'active',
        tokenVersion: 0,
      });

      const res = await request(app)
        .get('/api/admin/reports/donations?format=csv')
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(403);
    });

    it('should reject invalid report types with 400', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: '65f1234567890abcdef12345',
        role: 'admin',
        accountStatus: 'active',
        tokenVersion: 0,
      });

      const res = await request(app)
        .get('/api/admin/reports/unknown-type?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });

    it('should reject platform-summary with format=csv with 422', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: '65f1234567890abcdef12345',
        role: 'admin',
        accountStatus: 'active',
        tokenVersion: 0,
      });

      const res = await request(app)
        .get('/api/admin/reports/platform-summary?format=csv')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/pdf format only/i);
    });

    it('should reject audit with format=pdf with 422', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: '65f1234567890abcdef12345',
        role: 'admin',
        accountStatus: 'active',
        tokenVersion: 0,
      });

      const res = await request(app)
        .get('/api/admin/reports/audit?format=pdf')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(422);
      expect(res.body.message).toMatch(/csv format only/i);
    });
  });

  describe('CSV Injection Neutralization', () => {
    it('should prefix dangerous formula characters (=, +, -, @, tab) with a single quote', () => {
      expect(sanitizeCsvCell('=1+1')).toBe("'=1+1");
      expect(sanitizeCsvCell('+cmd|')).toBe("'+cmd|");
      expect(sanitizeCsvCell('-5')).toBe("'-5");
      expect(sanitizeCsvCell('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
      expect(sanitizeCsvCell('Normal text')).toBe('Normal text');
      expect(sanitizeCsvCell('Text with, comma')).toBe('"Text with, comma"');
    });
  });
});
