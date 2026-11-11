import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';

const reset = async () => {
  try {
    await connectDB();
    const hash = await bcrypt.hash('Admin@12345', 12);
    const result = await User.findOneAndUpdate(
      { email: 'admin@medibridge.local' },
      {
        passwordHash: hash,
        failedLoginAttempts: 0,
        lockUntil: null,
        accountStatus: 'active',
      },
      { new: true }
    );
    console.log('✅ Admin user reset:', result ? result.email : 'NOT FOUND');
    console.log('Account status:', result?.accountStatus);
    console.log('Failed login attempts:', result?.failedLoginAttempts);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await mongoose.connection.close();
  }
};

reset();
