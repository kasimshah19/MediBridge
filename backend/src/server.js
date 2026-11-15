import env from './config/env.js';
import connectDB from './config/db.js';
import syncDatabaseCollections from './config/syncDatabase.js';
import { initExpiryJob, runStartupCatchupIfRequired } from './jobs/expiry.job.js';
import app from './app.js';

const PORT = env.PORT;

/**
 * Start the server:
 * 1. Connect to MongoDB Atlas
 * 2. Synchronize collections and indexes
 * 3. Start listening on the designated PORT
 */
const startServer = async () => {
  // Connect to MongoDB
  const conn = await connectDB();

  // If connected, sync all collections & indexes and start scheduled jobs
  if (conn) {
    await syncDatabaseCollections();
    initExpiryJob();
    runStartupCatchupIfRequired();
  }

  const server = app.listen(PORT, () => {
    console.log(`🚀 MediBridge API running on port ${PORT}`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
  });

  // Handle unhandled promise rejections
  process.on('unhandledRejection', (err) => {
    console.error('❌ Unhandled Rejection:', err.message);
    server.close(() => {
      process.exit(1);
    });
  });

  // Graceful shutdown on SIGTERM
  process.on('SIGTERM', () => {
    console.log('👋 SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('💤 Server closed');
      process.exit(0);
    });
  });
};

startServer();
