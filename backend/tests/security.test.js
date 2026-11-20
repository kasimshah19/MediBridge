import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import env from '../src/config/env.js';

let app;
let User;
let Donation;
let adminToken;
let suspendedUserToken;

beforeAll(async () => {
  const userModule = await import('../src/models/User.js');
  User = userModule.default;

  const donationModule = await import('../src/models/Donation.js');
  Donation = donationModule.default;

  const appModule = await import('../src/app.js');
  app = appModule.default;

  adminToken = jwt.sign(
    { id: '65f1234567890abcdef12345', tokenVersion: 0 },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  suspendedUserToken = jwt.sign(
    { id: '65f1234567890abcdef12399', tokenVersion: 0 },
    env.JWT_SECRET,
    { expiresIn: '1d' }
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Phase 8: Security Hardening & Session Revocation Suite', () => {
  describe('Immediate Token Invalidation on Status Change', () => {
    it('should reject requests with 401 when tokenVersion does not match user tokenVersion', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: '65f1234567890abcdef12399',
        role: 'donor',
        accountStatus: 'active',
        tokenVersion: 1, // Mismatch!
      });

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${suspendedUserToken}`);

      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/session has been terminated|expired/i);
    });

    it('should reject requests with 403 when user is suspended', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: '65f1234567890abcdef12399',
        role: 'donor',
        accountStatus: 'suspended',
        tokenVersion: 0,
      });

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${suspendedUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/suspended/i);
    });

    it('should reject requests with 403 when user is blocked', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: '65f1234567890abcdef12399',
        role: 'donor',
        accountStatus: 'blocked',
        tokenVersion: 0,
      });

      const res = await request(app)
        .get('/api/users/me')
        .set('Authorization', `Bearer ${suspendedUserToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/blocked/i);
    });
  });

  describe('Admin Self-Modification & Role Protection', () => {
    it('should prevent admin from suspending themselves with 403', async () => {
      const adminOid = new mongoose.Types.ObjectId('65f1234567890abcdef12345');
      const adminUser = {
        _id: adminOid,
        role: 'admin',
        accountStatus: 'active',
        tokenVersion: 0,
      };

      jest.spyOn(User, 'findById').mockResolvedValue(adminUser);

      const res = await request(app)
        .patch(`/api/admin/users/${adminOid.toString()}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'suspend', reason: 'Self suspension test note' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/cannot modify their own account status/i);
    });

    it('should prevent admin from suspending another admin with 403', async () => {
      const requestingAdminOid = new mongoose.Types.ObjectId('65f1234567890abcdef12345');
      const targetAdminOid = new mongoose.Types.ObjectId('65f1234567890abcdef12349');

      const targetAdminUser = {
        _id: targetAdminOid,
        role: 'admin',
        accountStatus: 'active',
        tokenVersion: 0,
      };

      jest.spyOn(User, 'findById').mockImplementation(async (id) => {
        if (id.toString() === requestingAdminOid.toString()) {
          return { _id: requestingAdminOid, role: 'admin', accountStatus: 'active', tokenVersion: 0 };
        }
        return targetAdminUser;
      });

      const res = await request(app)
        .patch(`/api/admin/users/${targetAdminOid.toString()}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ action: 'suspend', reason: 'Admin suspension test note' });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/cannot modify the account status of another administrator/i);
    });
  });
});
