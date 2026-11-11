import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import env from '../config/env.js';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import { ROLES, ACCOUNT_STATUS, APPROVAL_STATUS } from '../config/constants.js';

/**
 * Seed script to ensure the initial system administrator account exists in database.
 * Uses ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD from environment variables.
 */
const seedAdmin = async () => {
  try {
    console.log('🌱 Connecting to database for admin seeding...');
    await connectDB();

    const existingAdmin = await User.findOne({ email: env.ADMIN_EMAIL.toLowerCase() });

    if (existingAdmin) {
      console.log(`ℹ️  Admin user already exists: ${existingAdmin.email} (Role: ${existingAdmin.role})`);
      process.exit(0);
    }

    console.log(`🔨 Creating initial administrator: ${env.ADMIN_EMAIL}...`);

    const passwordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 12);

    const admin = await User.create({
      name: env.ADMIN_NAME,
      email: env.ADMIN_EMAIL.toLowerCase(),
      passwordHash,
      role: ROLES.ADMIN,
      accountStatus: ACCOUNT_STATUS.ACTIVE,
      approvalStatus: APPROVAL_STATUS.NOT_REQUIRED,
      emailVerified: true,
      city: 'National Operations HQ',
    });

    console.log(`✅ System Administrator successfully seeded!`);
    console.log(`   ID:    ${admin._id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role:  ${admin.role}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to seed administrator account:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

seedAdmin();
