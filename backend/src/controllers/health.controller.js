import { getDBState } from '../config/db.js';

/**
 * Health check endpoint controller.
 * Returns real application status including database connection state.
 */
export const getHealth = (_req, res) => {
  res.status(200).json({
    success: true,
    app: 'MediBridge API',
    status: 'ok',
    environment: process.env.NODE_ENV || 'development',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    database: {
      state: getDBState(),
    },
  });
};

