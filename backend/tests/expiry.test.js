import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { DateTime } from 'luxon';
import {
  ROLES,
  APPROVAL_STATUS,
  PRIORITY_LEVELS,
  MEDICINE_STATUS,
  DONATION_STATUS,
} from '../src/config/constants.js';
import {
  calculatePriority,
  getDaysLeft,
  isExpired,
  getExpiryLabel,
  decorateMedicine,
  runExpiryCheck,
} from '../src/services/expiry.service.js';
import {
  nowIST,
  startOfDayIST,
  calendarDaysBetweenIST,
  endOfMonthIST,
  normalizeExpiryDate,
} from '../src/utils/dates.js';

import env from '../src/config/env.js';

let app;
let User;
let Donation;
let Medicine;
let JobRun;
let Notification;
let AuditLog;

beforeAll(async () => {
  const userMod = await import('../src/models/User.js');
  User = userMod.default;

  const donationMod = await import('../src/models/Donation.js');
  Donation = donationMod.default;

  const medicineMod = await import('../src/models/Medicine.js');
  Medicine = medicineMod.default;

  const jobRunMod = await import('../src/models/JobRun.js');
  JobRun = jobRunMod.default;

  const notifMod = await import('../src/models/Notification.js');
  Notification = notifMod.default;

  const auditMod = await import('../src/models/AuditLog.js');
  AuditLog = auditMod.default;

  const appMod = await import('../src/app.js');
  app = appMod.default;
});

afterEach(() => {
  jest.restoreAllMocks();
});

const generateTestToken = (payload) => {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: '1h' });
};

describe('Phase 4: Expiry Tracker & Scheduled Jobs Suite', () => {
  // ==========================================
  // PART 1: UNIT TESTS
  // ==========================================
  describe('Unit: calculatePriority Boundaries', () => {
    const referenceDate = new Date('2026-11-15T12:00:00.000Z');

    test('181 days left -> normal (> 180)', () => {
      const expiry = DateTime.fromJSDate(referenceDate).plus({ days: 181 }).toJSDate();
      expect(calculatePriority(expiry, referenceDate)).toBe(PRIORITY_LEVELS.NORMAL);
    });

    test('180 days left -> medium (91-180)', () => {
      const expiry = DateTime.fromJSDate(referenceDate).plus({ days: 180 }).toJSDate();
      expect(calculatePriority(expiry, referenceDate)).toBe(PRIORITY_LEVELS.MEDIUM);
    });

    test('91 days left -> medium (91-180)', () => {
      const expiry = DateTime.fromJSDate(referenceDate).plus({ days: 91 }).toJSDate();
      expect(calculatePriority(expiry, referenceDate)).toBe(PRIORITY_LEVELS.MEDIUM);
    });

    test('90 days left -> high (31-90)', () => {
      const expiry = DateTime.fromJSDate(referenceDate).plus({ days: 90 }).toJSDate();
      expect(calculatePriority(expiry, referenceDate)).toBe(PRIORITY_LEVELS.HIGH);
    });

    test('31 days left -> high (31-90)', () => {
      const expiry = DateTime.fromJSDate(referenceDate).plus({ days: 31 }).toJSDate();
      expect(calculatePriority(expiry, referenceDate)).toBe(PRIORITY_LEVELS.HIGH);
    });

    test('30 days left -> critical (0-30)', () => {
      const expiry = DateTime.fromJSDate(referenceDate).plus({ days: 30 }).toJSDate();
      expect(calculatePriority(expiry, referenceDate)).toBe(PRIORITY_LEVELS.CRITICAL);
    });

    test('0 days left (expires today) -> critical', () => {
      const expiry = DateTime.fromJSDate(referenceDate).set({ hour: 23, minute: 59, second: 59 }).toJSDate();
      expect(calculatePriority(expiry, referenceDate)).toBe(PRIORITY_LEVELS.CRITICAL);
    });

    test('-1 days left (expired) -> critical', () => {
      const expiry = DateTime.fromJSDate(referenceDate).minus({ days: 1 }).toJSDate();
      expect(calculatePriority(expiry, referenceDate)).toBe(PRIORITY_LEVELS.CRITICAL);
    });
  });

  describe('Unit: IST Behavior & Expiry Timestamps', () => {
    test('item expiring today at 23:59:59 IST is valid at 23:00 IST and expired at 00:00 IST next day', () => {
      // Expiry on 2026-11-15 at 23:59:59.999 IST
      const expiryIST = DateTime.fromObject(
        { year: 2026, month: 11, day: 15, hour: 23, minute: 59, second: 59, millisecond: 999 },
        { zone: 'Asia/Kolkata' }
      ).toJSDate();

      // Time 1: 2026-11-15 at 23:00:00 IST (valid today)
      const time1 = DateTime.fromObject(
        { year: 2026, month: 11, day: 15, hour: 23, minute: 0, second: 0 },
        { zone: 'Asia/Kolkata' }
      ).toJSDate();

      expect(isExpired(expiryIST, time1)).toBe(false);
      expect(getDaysLeft(expiryIST, time1)).toBe(0);
      expect(getExpiryLabel(0, false)).toBe('Expires today');

      // Time 2: 2026-11-16 at 00:00:01 IST (expired next day)
      const time2 = DateTime.fromObject(
        { year: 2026, month: 11, day: 16, hour: 0, minute: 0, second: 1 },
        { zone: 'Asia/Kolkata' }
      ).toJSDate();

      expect(isExpired(expiryIST, time2)).toBe(true);
      expect(getDaysLeft(expiryIST, time2)).toBe(-1);
      expect(getExpiryLabel(-1, true)).toBe('Expired yesterday');
    });

    test('getDaysLeft correctly calculates calendar days across month and year boundaries', () => {
      const nov30 = DateTime.fromObject({ year: 2026, month: 11, day: 30 }, { zone: 'Asia/Kolkata' }).toJSDate();
      const dec1 = DateTime.fromObject({ year: 2026, month: 12, day: 1 }, { zone: 'Asia/Kolkata' }).toJSDate();
      expect(calendarDaysBetweenIST(nov30, dec1)).toBe(1);

      const dec31 = DateTime.fromObject({ year: 2026, month: 12, day: 31 }, { zone: 'Asia/Kolkata' }).toJSDate();
      const jan1 = DateTime.fromObject({ year: 2027, month: 1, day: 1 }, { zone: 'Asia/Kolkata' }).toJSDate();
      expect(calendarDaysBetweenIST(dec31, jan1)).toBe(1);
    });

    test('getExpiryLabel generates accurate text for all intervals', () => {
      expect(getExpiryLabel(45, false)).toBe('45 days left');
      expect(getExpiryLabel(1, false)).toBe('1 day left');
      expect(getExpiryLabel(0, false)).toBe('Expires today');
      expect(getExpiryLabel(-1, true)).toBe('Expired yesterday');
      expect(getExpiryLabel(-3, true)).toBe('Expired 3 days ago');
    });
  });

  // ==========================================
  // PART 2: INTEGRATION & SERVICE TESTS
  // ==========================================
  describe('Integration: runExpiryCheck Logic', () => {
    test('lock prevents concurrent runs (returns skipped if job is already running)', async () => {
      jest.spyOn(JobRun, 'findOne').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        status: 'running',
        startedAt: new Date(),
      });

      const result = await runExpiryCheck({ trigger: 'manual_admin' });
      expect(result.skipped).toBe(true);
      expect(result.reason).toBe('already_running');
    });

    test('dryRun writes nothing and returns sample changes', async () => {
      jest.spyOn(JobRun, 'findOne').mockResolvedValue(null);
      jest.spyOn(JobRun, 'updateMany').mockResolvedValue({});
      jest.spyOn(JobRun, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        save: jest.fn().mockResolvedValue({}),
      });

      const fakeDonorId = new mongoose.Types.ObjectId();
      const fakeDonationId = new mongoose.Types.ObjectId();

      const sampleItems = [
        {
          _id: new mongoose.Types.ObjectId(),
          medicineId: 'MED-2026-000001',
          name: 'Paracetamol 500mg',
          donorId: fakeDonorId,
          donationId: fakeDonationId,
          expiryDate: new Date('2026-11-20T23:59:59.999+05:30'),
          status: MEDICINE_STATUS.PENDING,
          priority: PRIORITY_LEVELS.HIGH,
          expiryAlerts: {},
          statusHistory: [],
        },
      ];

      // Mock cursor
      const cursorMock = {
        async *[Symbol.asyncIterator]() {
          for (const item of sampleItems) yield item;
        },
      };

      const selectMock = {
        lean: jest.fn().mockReturnThis(),
        cursor: jest.fn().mockReturnValue(cursorMock),
      };

      jest.spyOn(Medicine, 'find').mockReturnValue({
        select: jest.fn().mockReturnValue(selectMock),
      });

      const bulkWriteSpy = jest.spyOn(Medicine, 'bulkWrite').mockResolvedValue({});

      const result = await runExpiryCheck({
        now: new Date('2026-11-15T00:00:00Z'),
        dryRun: true,
        trigger: 'manual_admin',
      });

      expect(result.dryRun).toBe(true);
      expect(bulkWriteSpy).not.toHaveBeenCalled();
      expect(result.sampleChanges).toBeDefined();
      expect(result.sampleChanges.length).toBeGreaterThan(0);
      expect(result.sampleChanges[0].toPriority).toBe(PRIORITY_LEVELS.CRITICAL);
    });
  });

  // ==========================================
  // PART 3: API ENDPOINTS & RBAC TESTS
  // ==========================================
  describe('API: Internal Jobs Webhook & RBAC', () => {
    test('POST /api/internal/jobs/expiry returns 401 without x-cron-secret', async () => {
      const res = await request(app).post('/api/internal/jobs/expiry');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('POST /api/internal/jobs/expiry returns 401 with invalid x-cron-secret', async () => {
      const res = await request(app)
        .post('/api/internal/jobs/expiry')
        .set('x-cron-secret', 'wrong_secret_token');
      expect(res.status).toBe(401);
    });

    test('POST /api/internal/jobs/expiry executes successfully with valid x-cron-secret', async () => {
      jest.spyOn(JobRun, 'findOne').mockResolvedValue(null);
      jest.spyOn(JobRun, 'updateMany').mockResolvedValue({});
      jest.spyOn(JobRun, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        save: jest.fn().mockResolvedValue({}),
      });

      const cursorMock = {
        async *[Symbol.asyncIterator]() {
          // empty for this test
        },
      };
      const selectMock = {
        lean: jest.fn().mockReturnThis(),
        cursor: jest.fn().mockReturnValue(cursorMock),
      };
      jest.spyOn(Medicine, 'find').mockReturnValue({
        select: jest.fn().mockReturnValue(selectMock),
      });

      const res = await request(app)
        .post('/api/internal/jobs/expiry')
        .set('x-cron-secret', env.CRON_SECRET)
        .send({ dryRun: true });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.dryRun).toBe(true);
    });

    test('NGO gets 403 Forbidden on /api/expiry/summary', async () => {
      const ngoId = new mongoose.Types.ObjectId();
      const token = generateTestToken({ id: ngoId.toString(), role: ROLES.NGO });

      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: ngoId,
        role: ROLES.NGO,
        status: 'active',
        approvalStatus: 'approved',
      });

      const res = await request(app)
        .get('/api/expiry/summary')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    test('Donor cannot call admin job endpoints (403 Forbidden)', async () => {
      const donorId = new mongoose.Types.ObjectId();
      const token = generateTestToken({ id: donorId.toString(), role: ROLES.DONOR });

      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: donorId,
        role: ROLES.DONOR,
        status: 'active',
      });

      const res = await request(app)
        .post('/api/admin/jobs/expiry/run')
        .set('Authorization', `Bearer ${token}`)
        .send({ dryRun: true });

      expect(res.status).toBe(403);
    });

    test('Donor sees only own items in /api/expiry/items', async () => {
      const donorId = new mongoose.Types.ObjectId();
      const token = generateTestToken({ id: donorId.toString(), role: ROLES.DONOR });

      jest.spyOn(User, 'findById').mockResolvedValue({
        _id: donorId,
        role: ROLES.DONOR,
        status: 'active',
      });

      const findSpy = jest.spyOn(Medicine, 'find').mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([]),
      });
      jest.spyOn(Medicine, 'countDocuments').mockResolvedValue(0);

      const res = await request(app)
        .get('/api/expiry/items')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      // Verify that Medicine.find was called with donorId scope
      const calledFilter = findSpy.mock.calls[0][0];
      expect(calledFilter.donorId.toString()).toBe(donorId.toString());
    });
  });
});
