import express from 'express';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import env from '../config/env.js';
import { AUDIT_ACTIONS } from '../config/constants.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import recordAuditLog from '../services/audit.service.js';
import { runExpiryCheck } from '../services/expiry.service.js';

const router = express.Router();

// Strict rate limiter for internal job endpoints (10 requests per hour per IP)
const internalJobLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    statusCode: 429,
    message: 'Too many internal job trigger requests. Maximum 10 per hour allowed.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Timing-safe secret verification middleware for external cron callers (GitHub Actions).
 */
const verifyCronSecret = async (req, res, next) => {
  try {
    const clientSecret = req.headers['x-cron-secret'];
    const expectedSecret = env.CRON_SECRET;

    if (!clientSecret || typeof clientSecret !== 'string' || !expectedSecret) {
      await recordAuditLog({
        action: AUDIT_ACTIONS.EXPIRY_JOB_RUN,
        actorType: 'system',
        req,
        meta: { status: 'rejected_missing_cron_secret' },
      });
      return next(new ApiError(401, 'Unauthorized: Missing or invalid x-cron-secret header'));
    }

    const clientBuffer = Buffer.from(clientSecret);
    const expectedBuffer = Buffer.from(expectedSecret);

    if (
      clientBuffer.length !== expectedBuffer.length ||
      !crypto.timingSafeEqual(clientBuffer, expectedBuffer)
    ) {
      await recordAuditLog({
        action: AUDIT_ACTIONS.EXPIRY_JOB_RUN,
        actorType: 'system',
        req,
        meta: { status: 'rejected_invalid_cron_secret' },
      });
      return next(new ApiError(401, 'Unauthorized: Invalid cron secret'));
    }

    next();
  } catch (err) {
    return next(new ApiError(401, 'Unauthorized: Secret verification error'));
  }
};

/**
 * POST /api/internal/jobs/expiry
 * Triggered by GitHub Actions or external monitoring services.
 */
router.post('/jobs/expiry', internalJobLimiter, verifyCronSecret, async (req, res, next) => {
  try {
    const { dryRun = false, asOf } = req.body || {};

    let executionAsOf = new Date();
    // Allow dev time travel only if explicitly enabled in non-production environments
    if (env.NODE_ENV !== 'production' && env.ALLOW_DEV_TIME_TRAVEL && asOf) {
      const parsedDate = new Date(asOf);
      if (!isNaN(parsedDate.getTime())) {
        executionAsOf = parsedDate;
      }
    }

    const result = await runExpiryCheck({
      now: executionAsOf,
      dryRun: Boolean(dryRun),
      trigger: 'github_actions',
    });

    if (result.skipped) {
      return next(new ApiError(409, 'An expiry check job is already running'));
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          jobRunId: result.jobRunId,
          dryRun: result.dryRun,
          stats: result.stats,
          durationMs: result.durationMs,
          sampleChanges: result.sampleChanges,
        },
        'Expiry check completed successfully'
      )
    );
  } catch (err) {
    next(err);
  }
});

export default router;

