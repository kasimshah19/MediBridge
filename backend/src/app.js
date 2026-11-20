import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import hpp from 'hpp';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';
import env from './config/env.js';
import { httpLogger } from './utils/logger.js';
import originCheck from './middleware/originCheck.js';
import apiLimiter from './middleware/rateLimiter.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import ApiError from './utils/ApiError.js';

const app = express();

// Trust reverse proxy hops (e.g. Render, Vercel, Cloudflare)
app.set('trust proxy', env.TRUST_PROXY_HOPS || 2);

// Security headers with strict production controls
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'none'"],
        frameAncestors: ["'none'"],
      },
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    frameguard: { action: 'deny' },
    hsts:
      env.NODE_ENV === 'production'
        ? {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true,
          }
        : false,
  })
);

// Prevent HTTP parameter pollution
app.use(hpp());

// CORS configuration - supports single URL, comma-separated URLs, and Vercel preview domains
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((o) => o.trim().replace(/\/$/, ''));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const clean = origin.replace(/\/$/, '');
      if (
        allowedOrigins.includes(clean) ||
        process.env.NODE_ENV !== 'production' ||
        clean.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(new Error(`CORS blocked for origin: ${origin}`));
    },
    credentials: true,
  })
);

// Body parsing with size limit
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Cookie parser
app.use(cookieParser());

// CSRF Origin verification for cookie-authenticated state changes in production
app.use(originCheck);

// Compress responses
app.use(compression());

// Structured HTTP logging with Pino
app.use(httpLogger);

// Sanitize data against NoSQL injection
app.use(mongoSanitize());

// Rate limiting
app.use('/api', apiLimiter);

// Note: Uploaded files are served exclusively through authenticated streaming endpoints (e.g. /api/organizations/:id/documents/:docId/file)

// Ensure database is connected before handling data queries (skip for health check & test env)
app.use((req, _res, next) => {
  if (
    process.env.NODE_ENV === 'test' ||
    req.path === '/api/health' ||
    req.path === '/health'
  ) {
    return next();
  }

  // Allow request if connected (1) or connecting/reconnecting (2, queries will buffer)
  if (mongoose.connection.readyState === 0 || mongoose.connection.readyState === 3) {
    return next(
      new ApiError(
        503,
        'Database is currently disconnected. Please verify your MongoDB Atlas IP whitelist (Network Access: 0.0.0.0/0) and credentials in backend/.env.'
      )
    );
  }

  next();
});

// Root endpoint - friendly API welcome message
app.get('/', (_req, res) => {
  res.json({
    success: true,
    app: 'MediBridge Backend API',
    status: 'online',
    health: '/api/health',
    frontend: process.env.CLIENT_URL || 'https://medi-bridge-taupe.vercel.app',
    message: 'Welcome to the MediBridge API service. For the user interface, please visit the frontend.',
  });
});

// API routes
app.use('/api', routes);

// 404 handler for unmatched routes
app.use(notFound);

// Central error handler
app.use(errorHandler);

export default app;
