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

  // Admin Seeding credentials
  ADMIN_NAME: z.string().default('System Administrator'),
  ADMIN_EMAIL: z.string().email().default('admin@medibridge.local'),
  ADMIN_PASSWORD: z.string().min(8).default('Admin@12345'),

  // Cookies & Security
  COOKIE_SECURE: z
    .string()
    .optional()
    .transform((val) => val === 'true'),

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

export default env;
