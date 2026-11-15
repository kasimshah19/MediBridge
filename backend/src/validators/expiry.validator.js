import { z } from 'zod';
import { PRIORITY_LEVELS_ARRAY, MEDICINE_STATUS_ARRAY } from '../config/constants.js';

export const expiryQuerySchema = z.object({
  priority: z.enum([...PRIORITY_LEVELS_ARRAY, 'all', 'expired']).optional(),
  status: z.enum([...MEDICINE_STATUS_ARRAY, 'all']).optional(),
  search: z.string().trim().max(100).optional(),
  sort: z.enum(['expiryDate', 'createdAt', 'name', 'priority', 'daysLeft']).optional().default('expiryDate'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export const runJobSchema = z.object({
  dryRun: z.boolean().optional().default(false),
  asOf: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}/).optional()),
});

