import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import syncDatabaseCollections from '../config/syncDatabase.js';

const listCollections = async () => {
  try {
    const conn = await connectDB();
    if (!conn) {
      console.log('Database not connected. Please check your MONGODB_URI in backend/.env');
      process.exit(1);
    }

    await syncDatabaseCollections();

    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n=============================================');
    console.log(`📦 MongoDB Database: ${mongoose.connection.name}`);
    console.log(`📋 Total Collections (${collections.length}):`);
    console.log('=============================================');
    collections.forEach((col, index) => {
      console.log(`  ${index + 1}. ${col.name}`);
    });
    console.log('=============================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error listing collections:', err.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

listCollections();

