import mongoose from 'mongoose';
import env from './env.js';

/**
 * Connect to MongoDB Atlas with clear console logs and graceful failure handling.
 * Never prints the full connection URI to avoid leaking secrets.
 */
const connectDB = async () => {
  if (
    !env.MONGODB_URI ||
    env.MONGODB_URI.includes('PASTE_YOUR_MONGODB_ATLAS_CONNECTION_STRING_HERE')
  ) {
    console.warn('⚠️  MONGODB_URI is using placeholder value. Please paste your MongoDB Atlas connection string in backend/.env');
    console.warn('⚠️  Database state: disconnected. Server will start in standby mode.');
    return null;
  }

  try {
    const conn = await mongoose.connect(env.MONGODB_URI);

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    console.log(`📦 Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️  MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.warn('⚠️  Graceful failure: Server continuing with database state: disconnected');
    return null;
  }
};

/**
 * Get the current database connection state as a human-readable string.
 */
export const getDBState = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'disconnected';
};

export default connectDB;
