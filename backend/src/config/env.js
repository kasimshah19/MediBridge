import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from backend directory reliably regardless of execution working directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback to current working directory

/**
 * Environment variables schema validation using Zod.
 * Exits the process with a clear error message if required variables are missing.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000').transform(Number),
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  CRON_SECRET: z.string().optional(),
  ENABLE_INTERNAL_CRON: z
    .string()
    .default('true')
    .transform((val) => val === 'true'),
  EXPIRY_CRON_SCHEDULE: z.string().default('10 0 * * *'),
  ALLOW_DEV_TIME_TRAVEL: z
    .string()
    .default('false')
    .transform((val) => val === 'true'),
  VERIFICATION_CLAIM_TTL_MINUTES: z.string().default('60').transform(Number),

  // Geo Matching & Claims (Phase 6)
  CLAIM_RESPONSE_TTL_HOURS: z.string().default('72').transform(Number),
  MAX_OPEN_REQUIREMENTS_PER_ORG: z.string().default('10').transform(Number),
  MAX_PENDING_CLAIMS_PER_ORG: z.string().default('5').transform(Number),
  GEO_RADII_KM: z
    .string()
    .default('5,10,20')
    .transform((val) =>
      val
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => !isNaN(n) && n > 0)
    ),
  DEFAULT_RADIUS_KM: z.string().default('10').transform(Number),

  // Admin Seeding credentials
  ADMIN_NAME: z.string().default('System Administrator'),
  ADMIN_EMAIL: z.string().email().default('admin@medibridge.local'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin@12345'),

  // Cookies & Security
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((val) => val === 'true'),

  // Donation & Medicine Screening Limits
  MIN_REMAINING_SHELF_LIFE_DAYS: z.string().default('90').transform(Number),
  MAX_ITEMS_PER_DONATION: z.string().default('10').transform(Number),
  MAX_PHOTOS_PER_MEDICINE: z.string().default('4').transform(Number),

  // Email notifications
  EMAIL_FROM: z.string().default('MediBridge <no-reply@medibridge.local>'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().transform((val) => (val ? Number(val) : undefined)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Environment variable validation failed:');
  console.error(parsed.error.format());
  process.exit(1);
}

const env = parsed.data;

// In production, ensure CRON_SECRET is not a placeholder and at least 24 characters
if (env.NODE_ENV === 'production') {
  if (
    !env.CRON_SECRET ||
    env.CRON_SECRET.toLowerCase().includes('change_this') ||
    env.CRON_SECRET.toLowerCase().includes('placeholder') ||
    env.CRON_SECRET.length < 24
  ) {
    console.error(
      '❌ Fatal: CRON_SECRET must be configured with a secure random string of at least 24 characters in production.'
    );
    process.exit(1);
  }
}

export default env;
