import mongoose from 'mongoose';
import AuditLog from '../models/AuditLog.js';

/**
 * Service to record tamper-evident audit logs for user and system actions.
 * Only attempts to write to database if Mongoose connection is ready.
 *
 * @param {object} params
 * @param {string|null} params.userId
 * @param {string} params.action - AUDIT_ACTIONS constant
 * @param {import('express').Request} [params.req] - Express request to extract IP & user-agent
 * @param {object} [params.meta] - Additional metadata
 */
export const recordAuditLog = async ({
  userId = null,
  action,
  actorType = 'user',
  req = null,
  meta = {},
}) => {
  // If database is not connected (e.g. during offline unit tests), skip buffer timeout
  if (mongoose.connection.readyState !== 1) {
    return;
  }

  try {
    let ip = null;
    let userAgent = null;

    if (req) {
      ip = req.ip || req.headers['x-forwarded-for'] || req.socket?.remoteAddress;
      userAgent = req.headers['user-agent'] || null;
    }

    await AuditLog.create({
      userId,
      actorType,
      action,
      ip,
      userAgent,
      meta,
    });
  } catch (error) {
    // Non-blocking: audit log failure should not crash main transactions, but should be logged
    console.error('❌ Failed to record audit log:', error.message);
  }
};

export default recordAuditLog;
