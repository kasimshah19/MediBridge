import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoSanitize from 'express-mongo-sanitize';
import apiLimiter from './middleware/rateLimiter.js';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const app = express();

// Security headers
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  })
);

// Body parsing with size limit
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cookie parser
app.use(cookieParser());

// Compress responses
app.use(compression());

// HTTP request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));
}

// Sanitize data against NoSQL injection
app.use(mongoSanitize());

// Rate limiting
app.use('/api', apiLimiter);

// Serve uploaded files statically
app.use('/uploads', express.static('uploads'));

// API routes
app.use('/api', routes);

// 404 handler for unmatched routes
app.use(notFound);

// Central error handler
app.use(errorHandler);

export default app;

