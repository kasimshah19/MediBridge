import { jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

let app;
let User;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test_secret_for_jwt_testing_12345';
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test_medibridge';

  const userModule = await import('../src/models/User.js');
  User = userModule.default;

  const appModule = await import('../src/app.js');
  app = appModule.default;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Authentication & Authorization Suite (Phase 1)', () => {
  const validDonor = {
    name: 'Rahul Sharma',
    email: 'rahul.sharma@example.com',
    phone: '9876543210',
    password: 'Password123',
    confirmPassword: 'Password123',
    role: 'donor',
    city: 'Mumbai',
  };

  describe('POST /api/auth/register', () => {
    it('should register a donor successfully and return token with user', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);
      jest.spyOn(User, 'create').mockResolvedValue({
        _id: '65f1234567890abcdef12345',
        name: validDonor.name,
        email: validDonor.email,
        phone: validDonor.phone,
        role: 'donor',
        accountStatus: 'active',
        approvalStatus: 'not_required',
        city: validDonor.city,
        createdAt: new Date(),
        updatedAt: new Date(),
        toObject: function () {
          return { ...this };
        },
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(validDonor);

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validDonor.email);
      expect(res.body.data.user.role).toBe('donor');
      expect(res.body.data).toHaveProperty('token');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should reject registration if email is duplicate', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue({
        _id: '65f1234567890abcdef12345',
        email: validDonor.email,
      });

      const res = await request(app)
        .post('/api/auth/register')
        .send(validDonor);

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should reject admin role registration with 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          ...validDonor,
          email: 'admin.hacker@example.com',
          role: 'admin',
        });

      // Zod or controller guard rejects admin
      expect([400, 403]).toContain(res.statusCode);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should reject login with wrong password', async () => {
      const mockUser = {
        _id: '65f1234567890abcdef12345',
        email: validDonor.email,
        passwordHash: await bcrypt.hash('CorrectPassword123', 10),
        accountStatus: 'active',
        isLocked: () => false,
        comparePassword: async () => false,
        failedLoginAttempts: 0,
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validDonor.email,
          password: 'WrongPassword123',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Invalid email or password');
    });

    it('should login successfully and set auth cookie', async () => {
      const mockUser = {
        _id: '65f1234567890abcdef12345',
        name: validDonor.name,
        email: validDonor.email,
        role: 'donor',
        accountStatus: 'active',
        approvalStatus: 'not_required',
        isLocked: () => false,
        comparePassword: async () => true,
        save: jest.fn().mockResolvedValue(true),
        toObject: function () {
          return {
            _id: this._id,
            name: this.name,
            email: this.email,
            role: this.role,
            accountStatus: this.accountStatus,
            approvalStatus: this.approvalStatus,
          };
        },
      };

      jest.spyOn(User, 'findOne').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: validDonor.email,
          password: validDonor.password,
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.email).toBe(validDonor.email);
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return 401 when accessed without token', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('RBAC Guards & Route Protection', () => {
    it('should reject donor accessing admin test route with 403', async () => {
      const donorUser = {
        _id: '65f1234567890abcdef12345',
        name: 'Rahul Donor',
        email: 'rahul@example.com',
        role: 'donor',
        accountStatus: 'active',
        toObject: function () {
          return { ...this };
        },
      };

      jest.spyOn(User, 'findById').mockResolvedValue(donorUser);

      const token = jwt.sign({ id: donorUser._id }, process.env.JWT_SECRET || 'test_secret_for_jwt_testing_12345');

      const res = await request(app)
        .get('/api/auth/test/admin')
        .set('Authorization', `Bearer ${token}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/not authorized/i);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return generic success message even for unknown email', async () => {
      jest.spyOn(User, 'findOne').mockResolvedValue(null);

      const res = await request(app)
        .post('/api/auth/forgot-password')
        .send({ email: 'nonexistent.user@example.com' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/password reset link has been sent/i);
    });
  });
});
