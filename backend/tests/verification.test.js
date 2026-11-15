import { jest } from '@jest/globals';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import {
  ROLES,
  APPROVAL_STATUS,
  DONATION_STATUS,
  MEDICINE_STATUS,
  VERIFICATION_DECISION,
  REJECTION_REASON_CODES,
  MORE_INFO_REQUEST_TYPES,
  AUDIT_ACTIONS,
  NOTIFICATION_TYPES,
} from '../src/config/constants.js';
import { runExpiryCheck } from '../src/services/expiry.service.js';
import env from '../src/config/env.js';

let app;
let User;
let Donation;
let Medicine;
let Verification;
let Notification;
let AuditLog;

const TEST_SECRET = 'test_secret_for_jwt_testing_12345';
process.env.JWT_SECRET = TEST_SECRET;
process.env.NODE_ENV = 'test';

const generateTestToken = (id) => {
  return jwt.sign({ id }, env.JWT_SECRET, { expiresIn: '1h' });
};

beforeAll(async () => {
  const userMod = await import('../src/models/User.js');
  User = userMod.default;

  const donationMod = await import('../src/models/Donation.js');
  Donation = donationMod.default;

  const medicineMod = await import('../src/models/Medicine.js');
  Medicine = medicineMod.default;

  const verifMod = await import('../src/models/Verification.js');
  Verification = verifMod.default;

  const notifMod = await import('../src/models/Notification.js');
  Notification = notifMod.default;

  const auditMod = await import('../src/models/AuditLog.js');
  AuditLog = auditMod.default;

  const appMod = await import('../src/app.js');
  app = appMod.default;

  mongoose.connection.readyState = 1;
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('Phase 5 Integration Suite: Pharmacist Verification Workflow', () => {
  // Test User IDs
  const donorId = new mongoose.Types.ObjectId();
  const pharmacist1Id = new mongoose.Types.ObjectId();
  const pharmacist2Id = new mongoose.Types.ObjectId();
  const unapprovedPharmacistId = new mongoose.Types.ObjectId();
  const ngoId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();

const donorToken = generateTestToken(donorId);
const approvedPharmacist1Token = generateTestToken(pharmacist1Id);
const approvedPharmacist2Token = generateTestToken(pharmacist2Id);
const unapprovedPharmacistToken = generateTestToken(unapprovedPharmacistId);
const ngoToken = generateTestToken(ngoId);
const adminToken = generateTestToken(adminId);

beforeEach(() => {
  // Setup findById mock for User to correctly reflect approvalStatus and role
  jest.spyOn(User, 'findById').mockImplementation((id) => {
    const idStr = id?.toString ? id.toString() : String(id);
    let userData = {
      _id: id,
      name: 'Test User',
      firstName: 'Test',
      email: 'test@example.com',
      role: ROLES.DONOR,
      accountStatus: 'active',
      approvalStatus: APPROVAL_STATUS.NOT_REQUIRED,
    };

    if (idStr === pharmacist1Id.toString()) {
      userData = {
        _id: pharmacist1Id,
        name: 'Anita Sharma',
        firstName: 'Anita',
        email: 'anita.pharm@medibridge.local',
        phone: '+919876543210',
        role: ROLES.PHARMACIST,
        accountStatus: 'active',
        approvalStatus: APPROVAL_STATUS.APPROVED,
        pharmacyName: 'City Care Pharmacy',
      };
    } else if (idStr === pharmacist2Id.toString()) {
      userData = {
        _id: pharmacist2Id,
        name: 'Rajesh Verma',
        firstName: 'Rajesh',
        email: 'rajesh.pharm@medibridge.local',
        phone: '+919876543211',
        role: ROLES.PHARMACIST,
        accountStatus: 'active',
        approvalStatus: APPROVAL_STATUS.APPROVED,
        pharmacyName: 'Apollo Care',
      };
    } else if (idStr === unapprovedPharmacistId.toString()) {
      userData = {
        _id: unapprovedPharmacistId,
        name: 'Pending Pharmacist',
        firstName: 'Pending',
        email: 'pending.pharm@medibridge.local',
        role: ROLES.PHARMACIST,
        accountStatus: 'active',
        approvalStatus: APPROVAL_STATUS.PENDING,
      };
    } else if (idStr === donorId.toString()) {
      userData = {
        _id: donorId,
        name: 'Suresh Kumar',
        firstName: 'Suresh',
        email: 'suresh.donor@example.com',
        phone: '+919123456789',
        role: ROLES.DONOR,
        accountStatus: 'active',
        city: 'Mumbai',
      };
    } else if (idStr === adminId.toString()) {
      userData = {
        _id: adminId,
        name: 'Admin User',
        firstName: 'Admin',
        email: 'admin@medibridge.local',
        role: ROLES.ADMIN,
        accountStatus: 'active',
      };
    }

    return {
      ...userData,
      select: jest.fn().mockImplementation(() => ({
        ...userData,
        exec: jest.fn().mockResolvedValue(userData),
      })),
      exec: jest.fn().mockResolvedValue(userData),
    };
  });
});

  // ========================================================
  // 1. RBAC & ROUTE ACCESS TESTS
  // ========================================================
  describe('RBAC & Approval Gating on Pharmacist Routes', () => {
    test('Donor receives 403 on /api/verification/queue', async () => {
      const res = await request(app)
        .get('/api/verification/queue')
        .set('Authorization', `Bearer ${donorToken}`);
      expect(res.status).toBe(403);
    });

    test('NGO receives 403 on /api/verification/queue', async () => {
      const res = await request(app)
        .get('/api/verification/queue')
        .set('Authorization', `Bearer ${ngoToken}`);
      expect(res.status).toBe(403);
    });

    test('Unapproved (pending) pharmacist receives 403 with clear message', async () => {
      const res = await request(app)
        .get('/api/verification/queue')
        .set('Authorization', `Bearer ${unapprovedPharmacistToken}`);
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/pending/i);
    });

    test('Approved pharmacist gets 200 on /api/verification/summary', async () => {
      jest.spyOn(Donation, 'countDocuments').mockResolvedValue(5);
      jest.spyOn(Verification, 'countDocuments').mockResolvedValue(2);

      const findQueryMock = {
        select: jest.fn().mockImplementation(() => {
          const selectObj = Promise.resolve([]);
          selectObj.limit = jest.fn().mockResolvedValue([]);
          return selectObj;
        }),
      };

      jest.spyOn(Donation, 'find').mockReturnValue(findQueryMock);
      jest.spyOn(Medicine, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });
      jest.spyOn(Verification, 'find').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue([]),
        }),
      });

      const res = await request(app)
        .get('/api/verification/summary')
        .set('Authorization', `Bearer ${approvedPharmacist1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('awaitingReview');
      expect(res.body.data).toHaveProperty('decidedToday');
    });
  });

  // ========================================================
  // 2. CLAIM SYSTEM (60 min TTL, Conflict & Takeover)
  // ========================================================
  describe('Verification Claim System', () => {
    test('Pharmacist 1 claims donation successfully', async () => {
      const mockDonationId = new mongoose.Types.ObjectId();
      const mockDonation = {
        _id: mockDonationId,
        donationCode: 'DON-202611-0001',
        status: DONATION_STATUS.UNDER_VERIFICATION,
        review: {
          claimedBy: null,
          claimedAt: null,
          claimExpiresAt: null,
        },
      };

      jest.spyOn(Donation, 'findById').mockResolvedValue(mockDonation);
      jest.spyOn(Donation, 'findOneAndUpdate').mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          ...mockDonation,
          review: {
            claimedBy: pharmacist1Id,
            claimedAt: new Date(),
            claimExpiresAt: new Date(Date.now() + 3600000),
          },
        }),
      });
      jest.spyOn(AuditLog, 'create').mockResolvedValue({});

      const res = await request(app)
        .post(`/api/verification/donations/${mockDonationId}/claim`)
        .set('Authorization', `Bearer ${approvedPharmacist1Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.claimedBy).toBe(pharmacist1Id.toString());
      expect(res.body.data.isTakeover).toBe(false);
    });

    test('Pharmacist 2 attempts to claim actively held donation -> 409 conflict', async () => {
      const mockDonationId = new mongoose.Types.ObjectId();
      const activeClaimExpiry = new Date(Date.now() + 25 * 60 * 1000); // 25 min left
      const mockDonation = {
        _id: mockDonationId,
        donationCode: 'DON-202611-0001',
        status: DONATION_STATUS.UNDER_VERIFICATION,
        review: {
          claimedBy: pharmacist1Id,
          claimedAt: new Date(),
          claimExpiresAt: activeClaimExpiry,
        },
      };

      jest.spyOn(Donation, 'findById').mockResolvedValue(mockDonation);

      const res = await request(app)
        .post(`/api/verification/donations/${mockDonationId}/claim`)
        .set('Authorization', `Bearer ${approvedPharmacist2Token}`);

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/Anita/i); // First name of holding pharmacist
    });

    test('Expired claim allows Pharmacist 2 to take over (lazy expiry)', async () => {
      const mockDonationId = new mongoose.Types.ObjectId();
      const expiredAt = new Date(Date.now() - 10 * 60 * 1000); // 10 min ago
      const mockDonation = {
        _id: mockDonationId,
        donationCode: 'DON-202611-0001',
        status: DONATION_STATUS.UNDER_VERIFICATION,
        review: {
          claimedBy: pharmacist1Id,
          claimedAt: new Date(Date.now() - 70 * 60 * 1000),
          claimExpiresAt: expiredAt,
        },
      };

      jest.spyOn(Donation, 'findById').mockResolvedValue(mockDonation);
      jest.spyOn(Donation, 'findOneAndUpdate').mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          ...mockDonation,
          review: {
            claimedBy: pharmacist2Id,
            claimedAt: new Date(),
            claimExpiresAt: new Date(Date.now() + 3600000),
          },
        }),
      });
      const auditSpy = jest.spyOn(AuditLog, 'create').mockResolvedValue({});

      const res = await request(app)
        .post(`/api/verification/donations/${mockDonationId}/claim`)
        .set('Authorization', `Bearer ${approvedPharmacist2Token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.claimedBy).toBe(pharmacist2Id.toString());
      expect(res.body.data.isTakeover).toBe(true);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_ACTIONS.VERIFICATION_CLAIM_EXPIRED_TAKEOVER,
        })
      );
    });

    test('Non-holder pharmacist cannot release someone elses claim -> 403', async () => {
      const mockDonationId = new mongoose.Types.ObjectId();
      const mockDonation = {
        _id: mockDonationId,
        review: {
          claimedBy: pharmacist1Id,
        },
      };

      jest.spyOn(Donation, 'findById').mockResolvedValue(mockDonation);

      const res = await request(app)
        .post(`/api/verification/donations/${mockDonationId}/release`)
        .set('Authorization', `Bearer ${approvedPharmacist2Token}`);

      expect(res.status).toBe(403);
    });

    test('Admin can force-release any claim via admin endpoint -> 200', async () => {
      const mockDonationId = new mongoose.Types.ObjectId();
      const mockDonation = {
        _id: mockDonationId,
        donationCode: 'DON-202611-0001',
        review: {
          claimedBy: pharmacist1Id,
          claimedAt: new Date(),
          claimExpiresAt: new Date(Date.now() + 3600000),
        },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Donation, 'findById').mockResolvedValue(mockDonation);
      const auditSpy = jest.spyOn(AuditLog, 'create').mockResolvedValue({});

      const res = await request(app)
        .post(`/api/admin/verification/donations/${mockDonationId}/force-release`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(mockDonation.review.claimedBy).toBeNull();
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_ACTIONS.VERIFICATION_ADMIN_FORCE_RELEASE,
        })
      );
    });
  });

  // ========================================================
  // 3. DECISION WORKFLOW & CONCURRENCY
  // ========================================================
  describe('Verification Decisions & Status Derivation', () => {
    const fullChecklist = {
      packagingIntact: true,
      batchReadable: true,
      expiryValid: true,
      storageReliable: true,
      authenticityEstablished: true,
      policyEligible: true,
    };

    test('Decision without active claim is blocked (409)', async () => {
      const medicineId = new mongoose.Types.ObjectId();
      const donationId = new mongoose.Types.ObjectId();

      jest.spyOn(Medicine, 'findById').mockResolvedValue({
        _id: medicineId,
        donationId,
        status: MEDICINE_STATUS.PENDING,
      });

      // Donation has no claim
      jest.spyOn(Donation, 'findById').mockResolvedValue({
        _id: donationId,
        review: { claimedBy: null },
      });

      const res = await request(app)
        .post(`/api/verification/items/${medicineId}/decision`)
        .set('Authorization', `Bearer ${approvedPharmacist1Token}`)
        .send({
          decision: VERIFICATION_DECISION.APPROVED,
          checklist: fullChecklist,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/hold an active claim/i);
    });

    test('Decision to approve an expired medicine is blocked (409)', async () => {
      const medicineId = new mongoose.Types.ObjectId();
      const donationId = new mongoose.Types.ObjectId();

      jest.spyOn(Medicine, 'findById').mockResolvedValue({
        _id: medicineId,
        donationId,
        name: 'Paracetamol',
        status: MEDICINE_STATUS.PENDING,
        expiryDate: new Date('2020-01-01'), // Expired!
        batchNumber: 'BTH001',
      });

      jest.spyOn(Donation, 'findById').mockResolvedValue({
        _id: donationId,
        review: {
          claimedBy: pharmacist1Id,
          claimExpiresAt: new Date(Date.now() + 3600000),
        },
      });

      const res = await request(app)
        .post(`/api/verification/items/${medicineId}/decision`)
        .set('Authorization', `Bearer ${approvedPharmacist1Token}`)
        .send({
          decision: VERIFICATION_DECISION.APPROVED,
          checklist: fullChecklist,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/expired/i);
    });

    test('Approve succeeds: creates immutable Verification, updates Medicine and Donation', async () => {
      const medicineId = new mongoose.Types.ObjectId();
      const donationId = new mongoose.Types.ObjectId();
      const futureExpiry = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000); // 300 days shelf life

      const mockMed = {
        _id: medicineId,
        donationId,
        donorId,
        name: 'Amoxicillin 500mg',
        batchNumber: 'AMX123',
        expiryDate: futureExpiry,
        quantity: 2,
        packagingCondition: 'sealed',
        status: MEDICINE_STATUS.PENDING,
        version: 0,
        verificationState: { round: 0 },
        photos: [
          {
            originalName: 'photo.jpg',
            storedName: 'photo.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
          },
        ],
      };

      const mockDonation = {
        _id: donationId,
        donorId,
        donationCode: 'DON-202611-0002',
        status: DONATION_STATUS.UNDER_VERIFICATION,
        statusHistory: [],
        review: {
          claimedBy: pharmacist1Id,
          claimExpiresAt: new Date(Date.now() + 3600000),
        },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Medicine, 'findById').mockResolvedValue(mockMed);
      jest.spyOn(Donation, 'findById').mockResolvedValue(mockDonation);

      const createdVerification = {
        _id: new mongoose.Types.ObjectId(),
        medicineId,
        donationId,
        pharmacistId: pharmacist1Id,
        decision: VERIFICATION_DECISION.APPROVED,
        checklist: fullChecklist,
        round: 1,
      };

      jest.spyOn(Verification, 'create').mockResolvedValue(createdVerification);
      jest.spyOn(Medicine, 'findOneAndUpdate').mockResolvedValue({
        ...mockMed,
        status: MEDICINE_STATUS.APPROVED,
        version: 1,
        verificationState: { round: 1, latestVerificationId: createdVerification._id },
      });

      // Donation has only this medicine -> once approved, donation status becomes approved
      jest.spyOn(Medicine, 'find').mockResolvedValue([
        { _id: medicineId, status: MEDICINE_STATUS.APPROVED },
      ]);

      jest.spyOn(AuditLog, 'create').mockResolvedValue({});
      jest.spyOn(Notification, 'create').mockResolvedValue({});

      const res = await request(app)
        .post(`/api/verification/items/${medicineId}/decision`)
        .set('Authorization', `Bearer ${approvedPharmacist1Token}`)
        .send({
          decision: VERIFICATION_DECISION.APPROVED,
          checklist: fullChecklist,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.donationStatus).toBe(DONATION_STATUS.APPROVED);
      expect(mockDonation.review.claimedBy).toBeNull(); // Claim cleared when review complete
    });

    test('Two parallel decisions on one item: exactly one succeeds, second gets 409', async () => {
      const medicineId = new mongoose.Types.ObjectId();
      const donationId = new mongoose.Types.ObjectId();
      const futureExpiry = new Date(Date.now() + 300 * 24 * 60 * 60 * 1000);

      const mockMed = {
        _id: medicineId,
        donationId,
        donorId,
        name: 'Metformin 500mg',
        batchNumber: 'MET999',
        expiryDate: futureExpiry,
        quantity: 1,
        packagingCondition: 'sealed',
        status: MEDICINE_STATUS.PENDING,
        version: 0,
        verificationState: { round: 0 },
        photos: [
          {
            originalName: 'photo.jpg',
            storedName: 'photo.jpg',
            mimeType: 'image/jpeg',
            size: 1024,
          },
        ],
      };

      const mockDonation = {
        _id: donationId,
        donorId,
        donationCode: 'DON-202611-0003',
        status: DONATION_STATUS.UNDER_VERIFICATION,
        statusHistory: [],
        review: {
          claimedBy: pharmacist1Id,
          claimExpiresAt: new Date(Date.now() + 3600000),
        },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Medicine, 'findById').mockResolvedValue(mockMed);
      jest.spyOn(Donation, 'findById').mockResolvedValue(mockDonation);
      jest.spyOn(Verification, 'create').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
      jest.spyOn(Verification, 'findByIdAndDelete').mockResolvedValue({});

      // Simulate first request succeeds (returns updated doc), second request returns null because version changed
      let callCount = 0;
      jest.spyOn(Medicine, 'findOneAndUpdate').mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ...mockMed,
            status: MEDICINE_STATUS.APPROVED,
            version: 1,
          });
        }
        return Promise.resolve(null); // Concurrency conflict
      });

      jest.spyOn(Medicine, 'find').mockResolvedValue([{ status: MEDICINE_STATUS.APPROVED }]);
      jest.spyOn(AuditLog, 'create').mockResolvedValue({});
      jest.spyOn(Notification, 'create').mockResolvedValue({});

      // First decision call
      const res1 = await request(app)
        .post(`/api/verification/items/${medicineId}/decision`)
        .set('Authorization', `Bearer ${approvedPharmacist1Token}`)
        .send({
          decision: VERIFICATION_DECISION.APPROVED,
          checklist: fullChecklist,
        });

      // Second decision call
      const res2 = await request(app)
        .post(`/api/verification/items/${medicineId}/decision`)
        .set('Authorization', `Bearer ${approvedPharmacist1Token}`)
        .send({
          decision: VERIFICATION_DECISION.APPROVED,
          checklist: fullChecklist,
        });

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(409); // Conflict detected
    });
  });

  // ========================================================
  // 4. MORE-INFO FLOW & DONOR RESPONSE LOOP
  // ========================================================
  describe('Clarification (More Info) Loop', () => {
    test('Pharmacist requests more info -> item & donation become more_info_required', async () => {
      const medicineId = new mongoose.Types.ObjectId();
      const donationId = new mongoose.Types.ObjectId();

      const mockMed = {
        _id: medicineId,
        donationId,
        donorId,
        name: 'Omeprazole 20mg',
        batchNumber: 'OMP456',
        expiryDate: new Date(Date.now() + 200 * 24 * 60 * 60 * 1000),
        quantity: 3,
        packagingCondition: 'sealed',
        status: MEDICINE_STATUS.PENDING,
        version: 0,
        verificationState: { round: 0 },
      };

      const mockDonation = {
        _id: donationId,
        donorId,
        donationCode: 'DON-202611-0004',
        status: DONATION_STATUS.UNDER_VERIFICATION,
        statusHistory: [],
        review: {
          claimedBy: pharmacist1Id,
          claimExpiresAt: new Date(Date.now() + 3600000),
        },
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Medicine, 'findById').mockResolvedValue(mockMed);
      jest.spyOn(Donation, 'findById').mockResolvedValue(mockDonation);
      jest.spyOn(Verification, 'create').mockResolvedValue({ _id: new mongoose.Types.ObjectId() });
      jest.spyOn(Medicine, 'findOneAndUpdate').mockResolvedValue({
        ...mockMed,
        status: MEDICINE_STATUS.MORE_INFO_REQUIRED,
      });
      jest.spyOn(Medicine, 'find').mockResolvedValue([
        { status: MEDICINE_STATUS.MORE_INFO_REQUIRED },
      ]);
      const notifSpy = jest.spyOn(Notification, 'create').mockResolvedValue({});
      jest.spyOn(AuditLog, 'create').mockResolvedValue({});

      const res = await request(app)
        .post(`/api/verification/items/${medicineId}/decision`)
        .set('Authorization', `Bearer ${approvedPharmacist1Token}`)
        .send({
          decision: VERIFICATION_DECISION.MORE_INFO_REQUESTED,
          requestedTypes: [MORE_INFO_REQUEST_TYPES.CLEARER_BATCH_PHOTO],
          question: 'The batch number is partly cut off in the photo. Please upload a clear view.',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.donationStatus).toBe(DONATION_STATUS.MORE_INFO_REQUIRED);
      expect(notifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: donorId,
          type: NOTIFICATION_TYPES.VERIFICATION_MORE_INFO,
        })
      );
    });

    test('Donor responds to more info -> item becomes pending, donation returns to under_verification', async () => {
      const donationId = new mongoose.Types.ObjectId();
      const itemId = new mongoose.Types.ObjectId();

      const mockDonation = {
        _id: donationId,
        donorId,
        donationCode: 'DON-202611-0004',
        status: DONATION_STATUS.MORE_INFO_REQUIRED,
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };

      const mockMed = {
        _id: itemId,
        donationId,
        donorId,
        name: 'Omeprazole 20mg',
        status: MEDICINE_STATUS.MORE_INFO_REQUIRED,
        batchNumber: 'OMP456',
        storageHistory: '',
        verificationState: {
          round: 1,
          moreInfo: {
            requestedBy: pharmacist1Id,
          },
        },
        statusHistory: [],
        save: jest.fn().mockResolvedValue(true),
      };

      jest.spyOn(Donation, 'findOne').mockResolvedValue(mockDonation);
      jest.spyOn(Medicine, 'findOne').mockResolvedValue(mockMed);
      jest.spyOn(Medicine, 'find').mockResolvedValue([{ status: MEDICINE_STATUS.PENDING }]);
      const notifSpy = jest.spyOn(Notification, 'create').mockResolvedValue({});
      const auditSpy = jest.spyOn(AuditLog, 'create').mockResolvedValue({});

      const res = await request(app)
        .post(`/api/donations/${donationId}/items/${itemId}/respond`)
        .set('Authorization', `Bearer ${donorToken}`)
        .send({
          message: 'Here is the clearer photo and corrected batch number.',
          batchNumber: 'OMP456B',
          storageHistory: 'Kept in cool medicine box at room temperature.',
        });

      expect(res.status).toBe(200);
      expect(mockMed.status).toBe(MEDICINE_STATUS.PENDING);
      expect(mockMed.batchNumber).toBe('OMP456B');
      expect(mockDonation.status).toBe(DONATION_STATUS.UNDER_VERIFICATION);
      expect(auditSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          action: AUDIT_ACTIONS.DONOR_MORE_INFO_RESPONDED,
        })
      );
      expect(notifSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: pharmacist1Id,
          type: NOTIFICATION_TYPES.VERIFICATION_NEW_REQUEST,
        })
      );
    });
  });

  // ========================================================
  // 5. PRIVACY BOUNDARIES
  // ========================================================
  describe('Privacy & Data Sanitization', () => {
    test('Pharmacist review payload NEVER contains donor phone, email, or pickup address', async () => {
      const donationId = new mongoose.Types.ObjectId();
      const mockDonation = {
        _id: donationId,
        donationCode: 'DON-PRIVACY-01',
        status: DONATION_STATUS.UNDER_VERIFICATION,
        submittedAt: new Date(),
        pickupAddress: {
          line1: '123 Secret Street',
          city: 'Pune',
          pincode: '411001',
        },
        contactPhone: '+919999888877',
        location: {
          coordinates: [73.8567, 18.5204],
        },
        donorId: {
          _id: donorId,
          firstName: 'Suresh',
          name: 'Suresh Kumar',
          email: 'secret.email@example.com',
          phone: '+919999888877',
        },
        items: [],
        review: {},
      };

      jest.spyOn(Donation, 'findById').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          populate: jest.fn().mockReturnValue({
            populate: jest.fn().mockResolvedValue(mockDonation),
          }),
        }),
      });

      jest.spyOn(Verification, 'find').mockReturnValue({
        populate: jest.fn().mockReturnValue({
          sort: jest.fn().mockResolvedValue([]),
        }),
      });

      const res = await request(app)
        .get(`/api/verification/donations/${donationId}`)
        .set('Authorization', `Bearer ${approvedPharmacist1Token}`);

      expect(res.status).toBe(200);
      const data = res.body.data;

      // Donor safe fields
      expect(data.donor).toEqual({ firstName: 'Suresh', city: 'Pune' });

      // Privacy violations must NOT exist
      expect(data.donor.email).toBeUndefined();
      expect(data.donor.phone).toBeUndefined();
      expect(data.contactPhone).toBeUndefined();
      expect(data.pickupAddress).toBeUndefined();
      expect(data.location).toBeUndefined();
    });

    test('Donor GET /api/donations/:id NEVER reveals pharmacist email or phone', async () => {
      const donationId = new mongoose.Types.ObjectId();
      const medicineId = new mongoose.Types.ObjectId();
      const verifId = new mongoose.Types.ObjectId();

      const mockDonation = {
        _id: donationId,
        donorId,
        donationCode: 'DON-PRIVACY-02',
        status: DONATION_STATUS.APPROVED,
        items: [
          {
            _id: medicineId,
            name: 'Cetirizine 10mg',
            status: MEDICINE_STATUS.APPROVED,
            expiryDate: new Date('2027-01-01'),
            verificationState: {
              latestVerificationId: verifId,
            },
          },
        ],
        toObject: function () {
          return { ...this };
        },
      };

      jest.spyOn(Donation, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValue(mockDonation),
      });

      const mockVerification = {
        _id: verifId,
        decision: VERIFICATION_DECISION.APPROVED,
        checklist: { packagingIntact: true, batchReadable: true, expiryValid: true },
        round: 1,
        verifiedAt: new Date(),
        pharmacistId: {
          firstName: 'Anita',
          name: 'Anita Sharma',
          pharmacyName: 'City Care Pharmacy',
          email: 'anita.private@hospital.com',
          phone: '+919876543210',
        },
      };

      jest.spyOn(Verification, 'find').mockReturnValue({
        populate: jest.fn().mockResolvedValue([mockVerification]),
      });

      const res = await request(app)
        .get(`/api/donations/${donationId}`)
        .set('Authorization', `Bearer ${donorToken}`);

      expect(res.status).toBe(200);
      const item = res.body.data.items[0];

      expect(item.verification).toBeDefined();
      expect(item.verification.pharmacist).toEqual({
        firstName: 'Anita',
        pharmacyName: 'City Care Pharmacy',
      });
      expect(item.verification.pharmacist.email).toBeUndefined();
      expect(item.verification.pharmacist.phone).toBeUndefined();
    });
  });

  // ========================================================
  // 6. PHASE 4 EXPIRY TRACKER COMPATIBILITY
  // ========================================================
  describe('Phase 4 Expiry Job Compatibility with more_info_required items', () => {
    test('Job tracks more_info_required items and marks them expired if past date', async () => {
      const pastDate = new Date('2026-01-01');
      const medId = new mongoose.Types.ObjectId();
      const donId = new mongoose.Types.ObjectId();

      const expiredMoreInfoMed = {
        _id: medId,
        donationId: donId,
        donorId,
        name: 'Expired Capsule',
        status: MEDICINE_STATUS.MORE_INFO_REQUIRED,
        expiryDate: pastDate,
        priority: 'high',
        expiryAlerts: {},
        statusHistory: [],
      };

      const sampleItems = [expiredMoreInfoMed];
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

      const JobRunMod = await import('../src/models/JobRun.js');
      const JobRun = JobRunMod.default;
      jest.spyOn(JobRun, 'findOne').mockResolvedValue(null);
      jest.spyOn(JobRun, 'updateMany').mockResolvedValue({});
      jest.spyOn(JobRun, 'create').mockResolvedValue({
        _id: new mongoose.Types.ObjectId(),
        save: jest.fn().mockResolvedValue(true),
      });

      jest.spyOn(User, 'find').mockReturnValue({
        select: jest.fn().mockResolvedValue([]),
      });

      const bulkWriteSpy = jest.spyOn(Medicine, 'bulkWrite').mockResolvedValue({});
      jest.spyOn(Donation, 'findById').mockReturnValue({
        populate: jest.fn().mockResolvedValue({
          _id: donId,
          status: DONATION_STATUS.MORE_INFO_REQUIRED,
          items: [{ status: MEDICINE_STATUS.EXPIRED }],
          statusHistory: [],
          save: jest.fn().mockResolvedValue(true),
        }),
      });
      jest.spyOn(AuditLog, 'create').mockResolvedValue({});
      jest.spyOn(Notification, 'create').mockResolvedValue({});

      const result = await runExpiryCheck({ dryRun: false });

      expect(result.stats.newlyExpired).toBe(1);
      expect(bulkWriteSpy).toHaveBeenCalled();
    });
  });
});
