import env from './config/env.js';
import connectDB from './config/db.js';
import app from './app.js';

const PORT = env.PORT;

/**
 * Start the server: connect to database first, then listen on the configured port.
 */
const startServer = async () => {
  // Connect to MongoDB
  await connectDB();

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

