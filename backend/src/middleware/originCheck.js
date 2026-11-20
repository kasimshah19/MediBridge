import env from '../config/env.js';
import recordAuditLog from '../services/audit.service.js';
import { AUDIT_ACTIONS } from '../config/constants.js';

/**
 * Origin Check Middleware (CSRF defense for state-changing operations in production).
 * Enforces Origin / Referer validation for mutation requests (POST, PUT, PATCH, DELETE).
 * Exempts Bearer token requests and CRON_SECRET authenticated job runners.
 */
export const originCheck = async (req, res, next) => {
  // Only enforce in production and for state-changing HTTP methods
  if (env.NODE_ENV !== 'production') {
    return next();
  }

  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // Exempt internal cron / scheduler requests carrying valid CRON_SECRET
  const cronHeader = req.headers['x-cron-secret'] || req.query.secret;
  if (cronHeader && env.CRON_SECRET && cronHeader === env.CRON_SECRET) {
    return next();
  }

  // Exempt requests carrying an explicit Authorization Bearer header (APIs / CLI scripts)
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    return next();
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer;
  const host = req.headers.host;

  // Allowed origins configured in environment
  const allowedOrigins = (env.CLIENT_URL || '')
    .split(',')
    .map((o) => o.trim().replace(/\/$/, ''))
    .filter(Boolean);

  const isAllowedOrigin = (urlStr) => {
    if (!urlStr) return false;
    try {
      const url = new URL(urlStr);
      const originBase = `${url.protocol}//${url.host}`;
      if (allowedOrigins.includes(originBase)) return true;
      if (url.hostname.endsWith('.vercel.app')) return true;
      if (host && (url.host === host || url.hostname === host)) return true;
      return false;
    } catch {
      return false;
    }
  };

  const originValid = origin ? isAllowedOrigin(origin) : null;
  const refererValid = referer ? isAllowedOrigin(referer) : null;

  // If neither Origin nor Referer is present on a cookie-based mutation in production, or if invalid
  if (
    (origin !== undefined && !originValid) ||
    (origin === undefined && referer !== undefined && !refererValid) ||
    (origin === undefined && referer === undefined && req.cookies && req.cookies.mb_token)
  ) {
    await recordAuditLog({
      action: AUDIT_ACTIONS.ORIGIN_CHECK_FAILED,
      actorType: 'anonymous',
      meta: {
        method: req.method,
        path: req.originalUrl || req.path,
        origin,
        referer,
        ip: req.ip,
      },
    }).catch(() => {});

    return res.status(403).json({
      success: false,
      message: 'Cross-origin request blocked: invalid or missing Origin/Referer header.',
    });
  }

  next();
};

export default originCheck;
