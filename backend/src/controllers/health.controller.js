import mongoose from 'mongoose';
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

/**
 * Kubernetes / Cloud Readiness Probe.
 * Returns 200 OK only if MongoDB connection is ready (state 1).
 */
export const getReadiness = (_req, res) => {
  const isReady = mongoose.connection.readyState === 1;
  const dbState = getDBState();

  if (isReady) {
    return res.status(200).json({
      success: true,
      status: 'ready',
      database: dbState,
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(503).json({
    success: false,
    status: 'not_ready',
    database: dbState,
    timestamp: new Date().toISOString(),
  });
};

