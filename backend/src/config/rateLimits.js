import rateLimit from 'express-rate-limit';
import env from './env.js';

const isTest = env.NODE_ENV === 'test';
const isProd = env.NODE_ENV === 'production';

// Helper to standardise responses
const createLimiter = (options) => {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isTest,
    ...options,
    message: {
      success: false,
      message: options.customMessage || 'Too many requests. Please try again later.',
    },
  });
};

// Global API limiter: 300 requests per 15 minutes per IP
export const globalLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 300 : 1000,
  customMessage: 'Too many requests from this IP, please try again after 15 minutes.',
});

// Authentication endpoints: 10 per 15 min in prod
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 15 : 100,
  customMessage: 'Too many authentication attempts from this IP, please try again after 15 minutes.',
});

// Password forgot / reset: 5 per hour
export const passwordResetLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 5 : 50,
  customMessage: 'Too many password reset requests. Please check your inbox or try again in an hour.',
});

// Uploads (documents and photos): 30 per 15 min
export const uploadLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 30 : 200,
  customMessage: 'Upload rate limit reached. Please wait a few minutes before uploading more files.',
});

// Donation submissions: 20 per hour
export const donationSubmitLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 20 : 100,
  customMessage: 'Too many donation submissions in a short period. Please try again later.',
});

// Claims: 30 per 15 min
export const claimsLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 30 : 150,
  customMessage: 'Claim action rate limit reached. Please try again in a few minutes.',
});

// Handover token generation / QR issuance: 20 per 15 min
export const tokenLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 20 : 100,
  customMessage: 'Too many token generation attempts. Please wait before requesting another token.',
});

// Handover lookup: 30 per 15 min
export const lookupLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 30 : 150,
  customMessage: 'Lookup rate limit exceeded. Please wait a few minutes before trying again.',
});

// Public verify / QR verify endpoints: 60 per 15 min
export const publicVerifyLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 60 : 300,
  customMessage: 'Too many verification lookups. Please try again later.',
});

// Geocoding / distance endpoints: 60 per minute
export const geocodeLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: isProd ? 60 : 300,
  customMessage: 'Too many location lookups. Please slow down.',
});

// Reports generation: 20 per hour per admin/IP
export const reportLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: isProd ? 20 : 100,
  customMessage: 'Report generation limit reached (20 reports per hour). Please try again later.',
});

// Admin Analytics queries: 120 per minute per admin/IP
export const analyticsLimiter = createLimiter({
  windowMs: 60 * 1000,
  max: isProd ? 120 : 500,
  customMessage: 'Analytics query rate limit reached. Please slow down your requests.',
});

export default {
  globalLimiter,
  authLimiter,
  passwordResetLimiter,
  uploadLimiter,
  donationSubmitLimiter,
  claimsLimiter,
  tokenLimiter,
  lookupLimiter,
  publicVerifyLimiter,
  geocodeLimiter,
  reportLimiter,
  analyticsLimiter,
};
