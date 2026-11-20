import pino from 'pino';
import pinoHttp from 'pino-http';
import crypto from 'crypto';
import env from '../config/env.js';

const isProduction = env.NODE_ENV === 'production';
const isTest = env.NODE_ENV === 'test';

const redactOptions = {
  paths: [
    'req.headers.authorization',
    'req.headers.cookie',
    'res.headers["set-cookie"]',
    '*.password',
    '*.token',
    '*.secret',
    '*.phone',
    '*.email',
  ],
  remove: true,
};

export const logger = pino({
  level: isTest ? 'silent' : env.LOG_LEVEL || 'info',
  redact: redactOptions,
  timestamp: pino.stdTimeFunctions.isoTime,
});

export const httpLogger = pinoHttp({
  logger,
  genReqId: (req) => req.headers['x-request-id'] || crypto.randomUUID(),
  autoLogging: !isTest,
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      query: req.query,
      headers: {
        host: req.headers.host,
        'user-agent': req.headers['user-agent'],
        'x-request-id': req.headers['x-request-id'],
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});

export default logger;
