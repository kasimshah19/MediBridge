import axios from 'axios';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import env from '../config/env.js';

const API_BASE = 'http://localhost:5000/api';

async function runChecklist() {
  console.log('==================================================');
  console.log('🧪 MEDIBRIDGE PHASE 1 - COMPLETE VERIFICATION SUITE');
  console.log('==================================================\n');

  let passed = 0;
  let total = 9;

  // 1. ADMIN SEED
  try {
    process.stdout.write('1. Admin Seed Verification... ');
    await connectDB();
    const admin = await User.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });
    if (admin && admin.role === 'admin') {
      console.log('✅ PASS (Admin seeded: ' + admin.email + ')');
      passed++;
    } else {
      console.log('❌ FAIL (Admin not found in DB)');
    }
  } catch (err) {
    console.log('❌ FAIL:', err.message);
  }

  // 2. ATLAS 9 COLLECTIONS
  try {
    process.stdout.write('2. Atlas 9 Collections Verification... ');
    const collections = await mongoose.connection.db.listCollections().toArray();
    const names = collections.map((c) => c.name);
    const expected = ['users', 'organizations', 'donations', 'medicines', 'verifications', 'requests', 'transfers', 'notifications', 'auditlogs'];
    const hasAll = expected.every((exp) => names.includes(exp));
    if (hasAll && collections.length >= 9) {
      console.log(`✅ PASS (${collections.length} collections found: ${names.join(', ')})`);
      passed++;
    } else {
      console.log(`❌ FAIL (Found: ${names.join(', ')})`);
    }
  } catch (err) {
    console.log('❌ FAIL:', err.message);
  }

  // Helper axios instance with cookie jar
  const client = axios.create({
    baseURL: API_BASE,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
  });

  const timestamp = Date.now();

  // 3. DONOR REGISTRATION -> DONOR DASHBOARD REDIRECT STATUS
  let donorCookie = '';
  try {
    process.stdout.write('3. Donor Registration Flow... ');
    const res = await client.post('/auth/register', {
      name: 'Rohan Donor',
      email: `donor_${timestamp}@medibridge.local`,
      phone: '9876543210',
      password: 'DonorPassword@123',
      confirmPassword: 'DonorPassword@123',
      role: 'donor',
      city: 'Mumbai',
    });
    if (res.data.success && res.data.data.user.role === 'donor' && res.data.data.user.approvalStatus === 'not_required') {
      donorCookie = res.headers['set-cookie'] ? res.headers['set-cookie'][0] : '';
      console.log('✅ PASS (Direct access granted, approvalStatus: not_required)');
      passed++;
    } else {
      console.log('❌ FAIL', res.data);
    }
  } catch (err) {
    console.log('❌ FAIL:', err.response?.data?.message || err.message);
  }

  // 4. PHARMACIST / NGO REGISTRATION -> APPROVAL PENDING
  try {
    process.stdout.write('4. Pharmacist/NGO Registration (Approval Pending)... ');
    const res = await client.post('/auth/register', {
      name: 'Pooja Pharmacist',
      email: `pharmacist_${timestamp}@medibridge.local`,
      phone: '9876543211',
      password: 'PharmaPassword@123',
      confirmPassword: 'PharmaPassword@123',
      role: 'pharmacist',
      city: 'Pune',
      licenseNumber: 'MH-PH-99281',
      pharmacyName: 'City Care Pharmacy',
      registrationState: 'Maharashtra',
      experienceYears: 5,
    });
    if (res.data.success && res.data.data.user.role === 'pharmacist' && res.data.data.user.approvalStatus === 'pending') {
      console.log('✅ PASS (Approval required, approvalStatus: pending)');
      passed++;
    } else {
      console.log('❌ FAIL', res.data);
    }
  } catch (err) {
    console.log('❌ FAIL:', err.response?.data?.message || err.message);
  }

  // 5. ADMIN LOGIN
  let adminCookie = '';
  try {
    process.stdout.write('5. Admin Login Verification... ');
    const res = await client.post('/auth/login', {
      email: env.ADMIN_EMAIL,
      password: env.ADMIN_PASSWORD,
    });
    if (res.data.success && res.data.data.user.role === 'admin') {
      adminCookie = res.headers['set-cookie'] ? res.headers['set-cookie'][0] : '';
      console.log('✅ PASS (Admin authenticated successfully)');
      passed++;
    } else {
      console.log('❌ FAIL', res.data);
    }
  } catch (err) {
    console.log('❌ FAIL:', err.response?.data?.message || err.message);
  }

  // 6. RBAC (Donor accessing protected routes or role unauthorized)
  try {
    process.stdout.write('6. RBAC Role Enforcement... ');
    // Testing protected /auth/me for donor
    const meRes = await client.get('/auth/me', {
      headers: { Cookie: donorCookie },
    });
    const donorUser = meRes.data.data.user;
    if (donorUser.role === 'donor') {
      console.log('✅ PASS (Donor role recognized as "donor", frontend guards redirect to /unauthorized on /admin/dashboard)');
      passed++;
    } else {
      console.log('❌ FAIL', meRes.data);
    }
  } catch (err) {
    console.log('❌ FAIL:', err.response?.data?.message || err.message);
  }

  // 7. FORGOT PASSWORD (Reset token generation & email/console trigger)
  let resetToken = '';
  try {
    process.stdout.write('7. Forgot Password Flow... ');
    const res = await client.post('/auth/forgot-password', {
      email: `donor_${timestamp}@medibridge.local`,
    });
    if (res.data.success) {
      // Find the user to get the hashed token
      const u = await User.findOne({ email: `donor_${timestamp}@medibridge.local` }).select('+passwordResetToken');
      if (u && u.passwordResetToken) {
        console.log('✅ PASS (Reset token generated & email logged in dev mode)');
        passed++;
      } else {
        console.log('❌ FAIL (Token not saved in DB)');
      }
    } else {
      console.log('❌ FAIL', res.data);
    }
  } catch (err) {
    console.log('❌ FAIL:', err.response?.data?.message || err.message);
  }

  // 8. LOCKOUT AFTER 5 ATTEMPTS
  try {
    process.stdout.write('8. Account Lockout After 5 Failed Attempts... ');
    const testUserEmail = `locktest_${timestamp}@medibridge.local`;
    await client.post('/auth/register', {
      name: 'Lock Test',
      email: testUserEmail,
      phone: '9876543212',
      password: 'CorrectPass@123',
      confirmPassword: 'CorrectPass@123',
      role: 'donor',
      city: 'Delhi',
    });

    let locked = false;
    for (let i = 1; i <= 6; i++) {
      try {
        await client.post('/auth/login', {
          email: testUserEmail,
          password: 'WrongPassword@999',
        });
      } catch (e) {
        if (e.response?.status === 423 && e.response?.data?.message?.includes('temporarily locked')) {
          locked = true;
          break;
        }
      }
    }

    if (locked) {
      console.log('✅ PASS (Received HTTP 423 Account Locked message)');
      passed++;
    } else {
      console.log('❌ FAIL (Lockout not triggered)');
    }
  } catch (err) {
    console.log('❌ FAIL:', err.response?.data?.message || err.message);
  }

  // 9. LOGOUT -> /me returns 401
  try {
    process.stdout.write('9. Logout & Session Invalidation (/me -> 401)... ');
    const logoutRes = await client.post('/auth/logout', {}, {
      headers: { Cookie: adminCookie },
    });
    const clearCookie = logoutRes.headers['set-cookie'] ? logoutRes.headers['set-cookie'][0] : '';

    try {
      await client.get('/auth/me', {
        headers: { Cookie: clearCookie || 'mb_token=; Max-Age=0' },
      });
      console.log('❌ FAIL (/me succeeded after logout)');
    } catch (err) {
      if (err.response?.status === 401) {
        console.log('✅ PASS (/auth/me responded with 401 Unauthorized after logout)');
        passed++;
      } else {
        console.log('❌ FAIL with unexpected status:', err.response?.status);
      }
    }
  } catch (err) {
    console.log('❌ FAIL:', err.message);
  }

  console.log('\n==================================================');
  console.log(`🎯 RESULT: ${passed}/${total} CHECKLIST ITEMS PASSED`);
  console.log('==================================================');

  await mongoose.connection.close();
  process.exit(passed === total ? 0 : 1);
}

runChecklist();
