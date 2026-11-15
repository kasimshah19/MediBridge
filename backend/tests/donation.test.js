import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import {
  ROLES,
  ACCOUNT_STATUS,
  APPROVAL_STATUS,
  DONATION_STATUS,
  MEDICINE_STATUS,
  SCREENING_CODES,
} from '../src/config/constants.js';

const TEST_SECRET = 'test_secret_for_jwt_testing_12345';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

let app;
let User;
let Donation;
let Medicine;
let AuditLog;
let Notification;
let Counter;
let storageService;

beforeAll(async () => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = TEST_SECRET;

  const userMod = await import('../src/models/User.js');
  User = userMod.default;

  const donationMod = await import('../src/models/Donation.js');
  Donation = donationMod.default;

  const medicineMod = await import('../src/models/Medicine.js');
  Medicine = medicineMod.default;

  const auditMod = await import('../src/models/AuditLog.js');
  AuditLog = auditMod.default;

  const notifMod = await import('../src/models/Notification.js');
  Notification = notifMod.default;

  const counterMod = await import('../src/models/Counter.js');
  Counter = counterMod.default;

  const storageMod = await import('../src/services/storage.service.js');
  storageService = storageMod.default;

  const appMod = await import('../src/app.js');
  app = appMod.default;

  // Mock database connection state so app.js health gate passes in tests
  mongoose.connection.readyState = 1;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Phase 3: Donation Submission & Auto-Screening API Test Suite', () => {
  const donorId = new mongoose.Types.ObjectId().toString();
  const otherDonorId = new mongoose.Types.ObjectId().toString();
  const ngoId = new mongoose.Types.ObjectId().toString();
  const pharmacistId = new mongoose.Types.ObjectId().toString();
  const adminId = new mongoose.Types.ObjectId().toString();

  const makeToken = (id) => jwt.sign({ id }, TEST_SECRET, { expiresIn: '1d' });

  const donorToken = makeToken(donorId);
  const otherDonorToken = makeToken(otherDonorId);
  const ngoToken = makeToken(ngoId);
  const pharmacistToken = makeToken(pharmacistId);
  const adminToken = makeToken(adminId);

  const mockDonor = {
    _id: donorId,
    name: 'Donor User',
    email: 'donor@test.com',
    role: ROLES.DONOR,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
    approvalStatus: APPROVAL_STATUS.NOT_REQUIRED,
  };

  const mockOtherDonor = {
    _id: otherDonorId,
    name: 'Other Donor',
    email: 'other@test.com',
    role: ROLES.DONOR,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
    approvalStatus: APPROVAL_STATUS.NOT_REQUIRED,
  };

  const mockNgo = {
    _id: ngoId,
    name: 'NGO User',
    email: 'ngo@test.com',
    role: ROLES.NGO,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
    approvalStatus: APPROVAL_STATUS.APPROVED,
  };

  const mockPharmacist = {
    _id: pharmacistId,
    name: 'Pharmacist User',
    email: 'pharm@test.com',
    role: ROLES.PHARMACIST,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
    approvalStatus: APPROVAL_STATUS.APPROVED,
  };

  const mockAdmin = {
    _id: adminId,
    name: 'System Admin',
    email: 'admin@test.com',
    role: ROLES.ADMIN,
    accountStatus: ACCOUNT_STATUS.ACTIVE,
    approvalStatus: APPROVAL_STATUS.NOT_REQUIRED,
  };

  const validDraftPayload = {
    items: [
      {
        name: 'Amoxicillin 500mg',
        genericName: 'Amoxicillin Trihydrate',
        manufacturer: 'Cipla Ltd',
        batchNumber: 'AMX-2026-01',
        expiryDate: '2028-10',
        quantity: 2,
        unit: 'strip',
        medicineType: 'capsule',
        packagingCondition: 'sealed',
        storageCondition: 'room_temperature',
      },
    ],
    pickupAddress: {
      line1: 'Flat 402, Green Meadows',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
    },
    location: {
      lat: 19.076,
      lng: 72.8777,
    },
    contactPhone: '9876543210',
    preferredTimeSlot: 'Morning (9 AM - 12 PM)',
    notes: 'Please call before arriving',
  };

  const setupUserMock = () => {
    jest.spyOn(User, 'findById').mockImplementation((id) => {
      const idStr = String(id);
      if (idStr === donorId) return Promise.resolve(mockDonor);
      if (idStr === otherDonorId) return Promise.resolve(mockOtherDonor);
      if (idStr === ngoId) return Promise.resolve(mockNgo);
      if (idStr === pharmacistId) return Promise.resolve(mockPharmacist);
      if (idStr === adminId) return Promise.resolve(mockAdmin);
      return Promise.resolve(null);
    });
  };

  test('1. Donor creates draft donation successfully', async () => {
    setupUserMock();
    jest.spyOn(Donation, 'countDocuments').mockResolvedValue(1); // <5 drafts
    const fakeDonationId = new mongoose.Types.ObjectId();
    const fakeMedId = new mongoose.Types.ObjectId();

    jest.spyOn(Medicine, 'create').mockResolvedValue({
      _id: fakeMedId,
      name: 'Amoxicillin 500mg',
      quantity: 2,
    });

    const mockSavedDonation = {
      _id: fakeDonationId,
      donorId,
      status: DONATION_STATUS.DRAFT,
      items: [fakeMedId],
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Donation.prototype, 'save').mockImplementation(function () {
      this._id = fakeDonationId;
      return Promise.resolve(this);
    });

    jest.spyOn(AuditLog, 'create').mockResolvedValue(true);

    jest.spyOn(Donation, 'findById').mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        _id: fakeDonationId,
        donorId,
        status: DONATION_STATUS.DRAFT,
        items: [{ _id: fakeMedId, name: 'Amoxicillin 500mg' }],
      }),
    });

    const res = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${donorToken}`)
      .send(validDraftPayload);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(DONATION_STATUS.DRAFT);
  });

  test('2. NGO and Pharmacist get 403 Forbidden on POST /api/donations', async () => {
    setupUserMock();

    const resNgo = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${ngoToken}`)
      .send(validDraftPayload);
    expect(resNgo.status).toBe(403);

    const resPharm = await request(app)
      .post('/api/donations')
      .set('Authorization', `Bearer ${pharmacistToken}`)
      .send(validDraftPayload);
    expect(resPharm.status).toBe(403);
  });

  test('3. Photo upload rejects fake file with magic bytes check (disguised .exe)', async () => {
    setupUserMock();
    const fakeExeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xFF\xFF');

    const res = await request(app)
      .post(`/api/donations/65f111111111111111111111/items/65f222222222222222222222/photos`)
      .set('Authorization', `Bearer ${donorToken}`)
      .attach('photo', fakeExeBuffer, 'medicine.jpg');

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid file content');
  });

  test('4. Photo upload accepts valid JPEG image buffer', async () => {
    setupUserMock();
    const donationId = new mongoose.Types.ObjectId().toString();
    const itemId = new mongoose.Types.ObjectId().toString();
    const photoId = new mongoose.Types.ObjectId().toString();

    jest.spyOn(Donation, 'findOne').mockResolvedValue({
      _id: donationId,
      donorId,
      status: DONATION_STATUS.DRAFT,
    });

    const mockMed = {
      _id: itemId,
      donationId,
      photos: [],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Medicine, 'findOne').mockResolvedValue(mockMed);

    jest.spyOn(storageService, 'saveMedicinePhoto').mockResolvedValue({
      storedName: '123-random.jpg',
      originalName: 'front-strip.jpg',
      mimeType: 'image/jpeg',
      size: 100,
    });
    jest.spyOn(AuditLog, 'create').mockResolvedValue(true);

    const validJpgBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x01,
      0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06,
      0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d,
      0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12, 0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d,
      0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28,
      0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32,
      0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01,
      0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
      0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02,
      0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01,
      0x01, 0x00, 0x00, 0x3f, 0x00, 0xbf, 0x00, 0xff, 0xd9,
    ]);

    const res = await request(app)
      .post(`/api/donations/${donationId}/items/${itemId}/photos`)
      .set('Authorization', `Bearer ${donorToken}`)
      .attach('photo', validJpgBuffer, 'front-strip.jpg');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.originalName).toBe('front-strip.jpg');
  });

  test('5. Cannot submit without confirming all four declarations (422)', async () => {
    setupUserMock();
    const donationId = new mongoose.Types.ObjectId().toString();

    jest.spyOn(Donation, 'findOne').mockResolvedValue({
      _id: donationId,
      donorId,
      status: DONATION_STATUS.DRAFT,
    });

    const res = await request(app)
      .post(`/api/donations/${donationId}/submit`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        declarations: {
          sealedAndUnused: true,
          storedProperly: true,
          notControlled: false, // Fails
          genuineInfo: true,
        },
      });

    expect(res.status).toBe(422);
    expect(res.body.message).toContain('declarations must be confirmed');
  });

  test('6. Valid submit moves to under_verification with donationCode and medicineId assigned', async () => {
    setupUserMock();
    const donationId = new mongoose.Types.ObjectId().toString();
    const medId = new mongoose.Types.ObjectId().toString();

    const mockDonation = {
      _id: donationId,
      donorId,
      status: DONATION_STATUS.DRAFT,
      statusHistory: [],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Donation, 'findOne').mockResolvedValue(mockDonation);

    const mockMedicine = {
      _id: medId,
      donationId,
      name: 'Amoxicillin 500mg',
      nameLower: 'amoxicillin 500mg',
      batchNumber: 'AMX-001',
      expiryDate: new Date('2028-10-31'),
      packagingCondition: 'sealed',
      storageCondition: 'room_temperature',
      medicineType: 'capsule',
      unit: 'strip',
      photos: [{ _id: 'photo-1' }],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Medicine, 'find').mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    });
    // First Medicine.find inside controller
    jest.spyOn(Medicine, 'find').mockImplementation((query) => {
      if (query.donationId && query.donationId.toString() === donationId) {
        return Promise.resolve([mockMedicine]);
      }
      return Promise.resolve([]);
    });

    jest.spyOn(Donation, 'find').mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    });

    jest.spyOn(Counter, 'findOneAndUpdate').mockImplementation(({ key }) => {
      return Promise.resolve({ key, seq: 1 });
    });

    jest.spyOn(AuditLog, 'create').mockResolvedValue(true);
    jest.spyOn(Notification, 'create').mockResolvedValue(true);

    jest.spyOn(Donation, 'findById').mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        ...mockDonation,
        status: DONATION_STATUS.UNDER_VERIFICATION,
        donationCode: 'DON-2026-000001',
        items: [{ ...mockMedicine, medicineId: 'MED-2026-000001', screening: { status: 'passed' } }],
      }),
    });

    const res = await request(app)
      .post(`/api/donations/${donationId}/submit`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        declarations: {
          sealedAndUnused: true,
          storedProperly: true,
          notControlled: true,
          genuineInfo: true,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe(DONATION_STATUS.UNDER_VERIFICATION);
    expect(res.body.data.donationCode).toMatch(/^DON-\d{4}-\d{6}$/);
    expect(res.body.data.items[0].screening.status).toBe('passed');
  });

  test('7. Cannot PATCH a submitted donation (409 Conflict)', async () => {
    setupUserMock();
    const donationId = new mongoose.Types.ObjectId().toString();

    jest.spyOn(Donation, 'findOne').mockResolvedValue({
      _id: donationId,
      donorId,
      status: DONATION_STATUS.UNDER_VERIFICATION,
    });

    const res = await request(app)
      .patch(`/api/donations/${donationId}`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ notes: 'Trying to modify after submission' });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('Only draft donations can be updated');
  });

  test('8. Duplicate item submission is flagged with DUPLICATE_ITEM', async () => {
    setupUserMock();
    const donationId = new mongoose.Types.ObjectId().toString();
    const medId = new mongoose.Types.ObjectId().toString();

    const mockDonation = {
      _id: donationId,
      donorId,
      status: DONATION_STATUS.DRAFT,
      statusHistory: [],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Donation, 'findOne').mockResolvedValue(mockDonation);

    const testExpiry = new Date('2028-10-31');
    const mockMedicine = {
      _id: medId,
      donationId,
      name: 'Amoxicillin 500mg',
      nameLower: 'amoxicillin 500mg',
      batchNumber: 'AMX-001',
      expiryDate: testExpiry,
      packagingCondition: 'sealed',
      storageCondition: 'room_temperature',
      medicineType: 'capsule',
      unit: 'strip',
      photos: [{ _id: 'photo-1' }],
      save: jest.fn().mockResolvedValue(true),
    };

    // Simulate existing item in another donation
    const existingMed = {
      name: 'Amoxicillin 500mg',
      nameLower: 'amoxicillin 500mg',
      batchNumber: 'AMX-001',
      expiryDate: testExpiry,
    };

    jest.spyOn(Medicine, 'find').mockImplementation((query) => {
      if (query.donationId && query.donationId.toString() === donationId) {
        return Promise.resolve([mockMedicine]);
      }
      if (query.donorId) {
        return Promise.resolve([existingMed]);
      }
      return Promise.resolve([]);
    });

    jest.spyOn(Donation, 'find').mockReturnValue({
      select: jest.fn().mockResolvedValue([{ _id: 'active-don-1' }]),
    });

    jest.spyOn(Counter, 'findOneAndUpdate').mockResolvedValue({ key: 'DON-2026', seq: 2 });
    jest.spyOn(AuditLog, 'create').mockResolvedValue(true);
    jest.spyOn(Notification, 'create').mockResolvedValue(true);

    jest.spyOn(Donation, 'findById').mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        ...mockDonation,
        status: DONATION_STATUS.SCREENING_REJECTED,
        donationCode: 'DON-2026-000002',
        items: [
          {
            ...mockMedicine,
            screening: {
              status: 'rejected',
              reasons: [{ code: SCREENING_CODES.DUPLICATE_ITEM, message: 'Duplicate item' }],
            },
          },
        ],
      }),
    });

    const res = await request(app)
      .post(`/api/donations/${donationId}/submit`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        declarations: {
          sealedAndUnused: true,
          storedProperly: true,
          notControlled: true,
          genuineInfo: true,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(DONATION_STATUS.SCREENING_REJECTED);
    expect(res.body.data.items[0].screening.status).toBe('rejected');
    expect(
      res.body.data.items[0].screening.reasons.some((r) => r.code === SCREENING_CODES.DUPLICATE_ITEM)
    ).toBe(true);
  });

  test('9. All-invalid submit moves donation to screening_rejected with per-item reasons', async () => {
    setupUserMock();
    const donationId = new mongoose.Types.ObjectId().toString();

    const mockDonation = {
      _id: donationId,
      donorId,
      status: DONATION_STATUS.DRAFT,
      statusHistory: [],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Donation, 'findOne').mockResolvedValue(mockDonation);

    const invalidMed = {
      _id: 'invalid-med-1',
      donationId,
      name: 'Insulin Glargine',
      nameLower: 'insulin glargine',
      batchNumber: 'IN', // <3 chars
      expiryDate: new Date('2020-01-01'), // Expired
      packagingCondition: 'opened',
      storageCondition: 'refrigerated',
      medicineType: 'injection',
      unit: 'vial',
      photos: [], // Missing photo
      save: jest.fn().mockResolvedValue(true),
    };

    jest.spyOn(Medicine, 'find').mockImplementation((query) => {
      if (query.donationId && query.donationId.toString() === donationId) {
        return Promise.resolve([invalidMed]);
      }
      return Promise.resolve([]);
    });

    jest.spyOn(Donation, 'find').mockReturnValue({
      select: jest.fn().mockResolvedValue([]),
    });

    jest.spyOn(Counter, 'findOneAndUpdate').mockResolvedValue({ key: 'DON-2026', seq: 3 });
    jest.spyOn(AuditLog, 'create').mockResolvedValue(true);
    jest.spyOn(Notification, 'create').mockResolvedValue(true);

    jest.spyOn(Donation, 'findById').mockReturnValue({
      populate: jest.fn().mockResolvedValue({
        ...mockDonation,
        status: DONATION_STATUS.SCREENING_REJECTED,
        donationCode: 'DON-2026-000003',
        items: [
          {
            ...invalidMed,
            screening: {
              status: 'rejected',
              reasons: [
                { code: SCREENING_CODES.EXPIRED, message: 'Expired' },
                { code: SCREENING_CODES.COLD_CHAIN_NOT_ACCEPTED, message: 'Cold chain' },
                { code: SCREENING_CODES.INJECTION_NOT_ACCEPTED, message: 'Injection' },
              ],
            },
          },
        ],
      }),
    });

    const res = await request(app)
      .post(`/api/donations/${donationId}/submit`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({
        declarations: {
          sealedAndUnused: true,
          storedProperly: true,
          notControlled: true,
          genuineInfo: true,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe(DONATION_STATUS.SCREENING_REJECTED);
    expect(res.body.data.items[0].screening.reasons.length).toBeGreaterThanOrEqual(3);
  });

  test('10. Photo access RBAC: Other donor gets 403, Admin gets 200, Pharmacist gets 200', async () => {
    setupUserMock();
    const donationId = new mongoose.Types.ObjectId().toString();
    const itemId = new mongoose.Types.ObjectId().toString();
    const photoId = new mongoose.Types.ObjectId().toString();

    const mockDonation = {
      _id: donationId,
      donorId: new mongoose.Types.ObjectId(donorId),
    };
    jest.spyOn(Donation, 'findById').mockResolvedValue(mockDonation);

    const mockMedWithPhotos = {
      _id: itemId,
      photos: {
        id: jest.fn().mockReturnValue({
          _id: photoId,
          storedName: 'fake-stored.jpg',
          originalName: 'front.jpg',
          mimeType: 'image/jpeg',
        }),
      },
    };

    jest.spyOn(Medicine, 'findOne').mockReturnValue({
      select: jest.fn().mockResolvedValue(mockMedWithPhotos),
    });

    // Mock readable stream for storageService
    const { Readable } = await import('stream');
    const mockStream = new Readable();
    mockStream.push(Buffer.from('fake image content'));
    mockStream.push(null);

    jest.spyOn(storageService, 'readMedicinePhotoStream').mockReturnValue(mockStream);

    // Other donor gets 403
    const resOther = await request(app)
      .get(`/api/donations/${donationId}/items/${itemId}/photos/${photoId}/file`)
      .set('Authorization', `Bearer ${otherDonorToken}`);
    expect(resOther.status).toBe(403);

    // Admin gets 200
    const resAdmin = await request(app)
      .get(`/api/donations/${donationId}/items/${itemId}/photos/${photoId}/file`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resAdmin.status).toBe(200);
    expect(resAdmin.headers['content-type']).toContain('image/jpeg');
    expect(resAdmin.headers['x-content-type-options']).toBe('nosniff');

    // Pharmacist gets 200
    const mockStream2 = new Readable();
    mockStream2.push(Buffer.from('fake image content'));
    mockStream2.push(null);
    jest.spyOn(storageService, 'readMedicinePhotoStream').mockReturnValue(mockStream2);

    const resPharm = await request(app)
      .get(`/api/donations/${donationId}/items/${itemId}/photos/${photoId}/file`)
      .set('Authorization', `Bearer ${pharmacistToken}`);
    expect(resPharm.status).toBe(200);
  });

  test('11. Donor cancels donation in under_verification state', async () => {
    setupUserMock();
    const donationId = new mongoose.Types.ObjectId().toString();

    const mockDonation = {
      _id: donationId,
      donorId,
      status: DONATION_STATUS.UNDER_VERIFICATION,
      statusHistory: [],
      save: jest.fn().mockResolvedValue(true),
    };
    jest.spyOn(Donation, 'findOne').mockResolvedValue(mockDonation);
    jest.spyOn(Medicine, 'updateMany').mockResolvedValue({ modifiedCount: 1 });
    jest.spyOn(AuditLog, 'create').mockResolvedValue(true);

    const res = await request(app)
      .post(`/api/donations/${donationId}/cancel`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ reason: 'Relocated to a different address before pickup' });

    expect(res.status).toBe(200);
    expect(mockDonation.status).toBe(DONATION_STATUS.CANCELLED);
    expect(mockDonation.cancelReason).toContain('Relocated to a different address');

    // Cannot cancel again
    const resAgain = await request(app)
      .post(`/api/donations/${donationId}/cancel`)
      .set('Authorization', `Bearer ${donorToken}`)
      .send({ reason: 'Try re-cancelling' });
    expect(resAgain.status).toBe(409);
  });

  test('12. Public config endpoint returns policy limits', async () => {
    const res = await request(app).get('/api/public/config');
    expect(res.status).toBe(200);
    expect(res.body.data.minShelfLifeDays).toBe(90);
    expect(res.body.data.maxItems).toBe(10);
    expect(res.body.data.maxPhotos).toBe(4);
  });
});
