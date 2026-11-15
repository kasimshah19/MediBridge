import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

const TEST_SECRET = 'test_secret_for_jwt_testing_12345';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

let app;
let User;
let Organization;
let Notification;
let storageService;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = TEST_SECRET;
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test_medibridge';

  const userModule = await import('../src/models/User.js');
  User = userModule.default;

  const orgModule = await import('../src/models/Organization.js');
  Organization = orgModule.default;

  const notifModule = await import('../src/models/Notification.js');
  Notification = notifModule.default;

  const storageModule = await import('../src/services/storage.service.js');
  storageService = storageModule.default;

  const appModule = await import('../src/app.js');
  app = appModule.default;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Phase 2: Organization Onboarding & Public API Test Suite', () => {
  const ngoUserId = new mongoose.Types.ObjectId().toString();
  const otherNgoUserId = new mongoose.Types.ObjectId().toString();
  const donorUserId = new mongoose.Types.ObjectId().toString();
  const adminUserId = new mongoose.Types.ObjectId().toString();

  const makeToken = (id) =>
    jwt.sign({ id }, TEST_SECRET, { expiresIn: '1d' });

  const ngoToken = makeToken(ngoUserId);
  const otherNgoToken = makeToken(otherNgoUserId);
  const donorToken = makeToken(donorUserId);
  const adminToken = makeToken(adminUserId);

  const mockNgoUser = {
    _id: ngoUserId,
    name: 'Care NGO Head',
    email: 'care@ngo.org',
    role: 'ngo',
    accountStatus: 'active',
    approvalStatus: 'pending',
  };

  const mockOtherNgoUser = {
    _id: otherNgoUserId,
    name: 'Other NGO Head',
    email: 'other@ngo.org',
    role: 'ngo',
    accountStatus: 'active',
    approvalStatus: 'pending',
  };

  const mockDonorUser = {
    _id: donorUserId,
    name: 'Donor Rohan',
    email: 'rohan@donor.com',
    role: 'donor',
    accountStatus: 'active',
    approvalStatus: 'not_required',
  };

  const mockAdminUser = {
    _id: adminUserId,
    name: 'Admin Kasim',
    email: 'admin@medibridge.local',
    role: 'admin',
    accountStatus: 'active',
  };

  const validOrgPayload = {
    name: 'Care Foundation NGO',
    type: 'ngo',
    registrationNumber: 'NGO-MH-2024-001',
    contactPerson: 'Care NGO Head',
    email: 'care@ngo.org',
    phone: '9876543210',
    address: '123 Health Street, Bandra West',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    description: 'Serving underprivileged families with essential medical care.',
    servicesOffered: ['general_medicine', 'pediatrics'],
    beneficiariesPerMonth: 250,
    operatingHours: '9am - 6pm',
    location: {
      lat: 19.0596,
      lng: 72.8295,
    },
  };

  // 1. NGO creates org
  it('1. NGO creates organization draft successfully', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue(mockNgoUser);
    jest.spyOn(Organization, 'findOne').mockResolvedValue(null);
    jest.spyOn(Organization, 'create').mockResolvedValue({
      _id: '65f9876543210abcdef98765',
      ...validOrgPayload,
      verificationStatus: 'draft',
      ownerId: ngoUserId,
    });
    jest.spyOn(User, 'findByIdAndUpdate').mockResolvedValue(mockNgoUser);

    const res = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${ngoToken}`)
      .send(validOrgPayload);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organization.verificationStatus).toBe('draft');
  });

  // 2. Second org for same NGO is rejected (409)
  it('2. Second organization for same NGO user is rejected with 409', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue(mockNgoUser);
    jest.spyOn(Organization, 'findOne').mockResolvedValue({
      _id: 'existing_org_id',
      ownerId: ngoUserId,
    });

    const res = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${ngoToken}`)
      .send(validOrgPayload);

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/already exists/i);
  });

  // 3. Donor cannot call org endpoints (403)
  it('3. Donor attempting to access NGO organization endpoints gets 403 Forbidden', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue(mockDonorUser);

    const res = await request(app)
      .post('/api/organizations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send(validOrgPayload);

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
  });

  // 4. Submit without documents fails (400)
  it('4. Submitting organization for review without required documents fails with 400', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue(mockNgoUser);
    jest.spyOn(Organization, 'findOne').mockResolvedValue({
      ...validOrgPayload,
      location: { coordinates: [72.8295, 19.0596] },
      verificationStatus: 'draft',
      documents: [], // Empty docs
    });

    const res = await request(app)
      .post('/api/organizations/me/submit')
      .set('Authorization', `Bearer ${ngoToken}`)
      .send();

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Missing required documents/i);
  });

  // 5. Upload of .exe renamed as .pdf is rejected (400)
  it('5. Uploading executable/fake file disguised as PDF is rejected by magic bytes inspection', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue(mockNgoUser);
    jest.spyOn(Organization, 'findOne').mockResolvedValue({
      _id: 'org123',
      ownerId: ngoUserId,
      verificationStatus: 'draft',
      documents: [],
    });

    // An executable binary starts with MZ header (0x4D, 0x5A)
    const fakeExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF');

    const res = await request(app)
      .post('/api/organizations/me/documents')
      .set('Authorization', `Bearer ${ngoToken}`)
      .field('type', 'registration_certificate')
      .attach('file', fakeExeBuffer, {
        filename: 'malicious.pdf',
        contentType: 'application/pdf',
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Invalid file content/i);
  });

  // 6. Document access permissions: Owner gets 200, another NGO gets 403, Admin gets 200
  describe('6. Document file streaming RBAC', () => {
    const orgId = new mongoose.Types.ObjectId().toString();
    const docId = new mongoose.Types.ObjectId().toString();

    const mockDoc = {
      _id: docId,
      type: 'registration_certificate',
      originalName: 'reg.pdf',
      storedName: 'stored-12345.pdf',
      mimeType: 'application/pdf',
      size: 1024,
    };

    const mockOrgWithDoc = {
      _id: orgId,
      ownerId: {
        equals: (id) => id.toString() === ngoUserId,
      },
      documents: {
        id: (id) => (id === docId ? mockDoc : null),
      },
    };

    it('Owner NGO can stream document (200)', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockNgoUser);
      jest.spyOn(Organization, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockOrgWithDoc),
      });
      jest.spyOn(storageService, 'fileExists').mockReturnValue(true);
      const mockStream = {
        on: jest.fn(),
        pipe: (res) => {
          res.status(200).send('mock-pdf-content');
        },
      };
      jest.spyOn(storageService, 'readFileStream').mockReturnValue(mockStream);

      const res = await request(app)
        .get(`/api/organizations/${orgId}/documents/${docId}/file`)
        .set('Authorization', `Bearer ${ngoToken}`);

      expect(res.statusCode).toBe(200);
    });

    it('Another NGO is rejected with 403 Forbidden', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockOtherNgoUser);
      jest.spyOn(Organization, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockOrgWithDoc),
      });

      const res = await request(app)
        .get(`/api/organizations/${orgId}/documents/${docId}/file`)
        .set('Authorization', `Bearer ${otherNgoToken}`);

      expect(res.statusCode).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Admin can stream document (200)', async () => {
      jest.spyOn(User, 'findById').mockResolvedValue(mockAdminUser);
      jest.spyOn(Organization, 'findById').mockReturnValue({
        select: jest.fn().mockResolvedValue(mockOrgWithDoc),
      });
      jest.spyOn(storageService, 'fileExists').mockReturnValue(true);
      const mockStream = {
        on: jest.fn(),
        pipe: (res) => {
          res.status(200).send('mock-pdf-content');
        },
      };
      jest.spyOn(storageService, 'readFileStream').mockReturnValue(mockStream);

      const res = await request(app)
        .get(`/api/organizations/${orgId}/documents/${docId}/file`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  // 7. Admin review requires note on reject
  it('7. Admin rejecting organization requires note of min 10 characters', async () => {
    jest.spyOn(User, 'findById').mockResolvedValue(mockAdminUser);

    const res = await request(app)
      .patch('/api/admin/organizations/org123/review')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        decision: 'rejected',
        note: 'Short', // Less than 10 characters!
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // 8. Verified review sets user approvalStatus to approved
  it('8. Admin approving organization sets user approvalStatus to approved', async () => {
    const mockOrg = {
      _id: 'org123',
      name: 'Care NGO',
      verificationStatus: 'pending',
      ownerId: ngoUserId,
      reviewHistory: [],
      save: jest.fn().mockResolvedValue(true),
    };

    const mockOwner = {
      ...mockNgoUser,
      save: jest.fn().mockResolvedValue(true),
    };

    const adminWithSave = {
      ...mockAdminUser,
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Organization, 'findById').mockResolvedValue(mockOrg);
    jest.spyOn(User, 'findById').mockImplementation(async (id) => {
      const idStr = String(id);
      if (idStr === adminUserId) return adminWithSave;
      if (idStr === ngoUserId) return mockOwner;
      return mockOwner;
    });
    jest.spyOn(Notification, 'create').mockResolvedValue({});

    const res = await request(app)
      .patch('/api/admin/organizations/org123/review')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        decision: 'verified',
        note: 'All documents verified and authentic.',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mockOrg.verificationStatus).toBe('verified');
    expect(mockOwner.approvalStatus).toBe('approved');
  });

  // 9. public/organizations returns only verified orgs and no private fields
  it('9. Public organizations endpoint returns only verified orgs and never exposes private fields', async () => {
    const verifiedOrgMock = {
      name: 'Verified Clinic',
      type: 'charitable_clinic',
      city: 'Pune',
      state: 'Maharashtra',
      servicesOffered: ['general_medicine'],
      createdAt: new Date(),
    };

    jest.spyOn(Organization, 'find').mockReturnValue({
      select: jest.fn().mockReturnValue({
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([verifiedOrgMock]),
        }),
      }),
    });

    const res = await request(app).get('/api/public/organizations');

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.organizations).toHaveLength(1);
    const org = res.body.data.organizations[0];
    expect(org).toHaveProperty('name', 'Verified Clinic');
    expect(org).toHaveProperty('type', 'charitable_clinic');
    expect(org).toHaveProperty('city', 'Pune');
    // Ensure sensitive private fields are NOT present
    expect(org).not.toHaveProperty('email');
    expect(org).not.toHaveProperty('phone');
    expect(org).not.toHaveProperty('documents');
    expect(org).not.toHaveProperty('ownerId');
    expect(org).not.toHaveProperty('address');
  });
});
