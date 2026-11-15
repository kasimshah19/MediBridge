import { z } from 'zod';
import {
  VERIFICATION_DECISION_ARRAY,
  REJECTION_REASON_CODES_ARRAY,
  MORE_INFO_REQUEST_TYPES_ARRAY,
} from '../config/constants.js';

export const decisionSchema = z.object({
  decision: z.enum(VERIFICATION_DECISION_ARRAY, {
    errorMap: () => ({ message: 'A valid verification decision is required (approved, rejected, more_info_requested).' }),
  }),
  checklist: z
    .object({
      packagingIntact: z.boolean().optional().default(false),
      batchReadable: z.boolean().optional().default(false),
      expiryValid: z.boolean().optional().default(false),
      storageReliable: z.boolean().optional().default(false),
      authenticityEstablished: z.boolean().optional().default(false),
      policyEligible: z.boolean().optional().default(false),
    })
    .optional()
    .default({}),
  reasonCode: z
    .enum(REJECTION_REASON_CODES_ARRAY, {
      errorMap: () => ({ message: 'A valid rejection reason code is required for rejected medicines.' }),
    })
    .optional()
    .nullable(),
  reason: z.string().max(500, 'Rejection note cannot exceed 500 characters.').optional().nullable(),
  requestedTypes: z.array(z.enum(MORE_INFO_REQUEST_TYPES_ARRAY)).optional().default([]),
  question: z.string().max(500, 'Clarification question cannot exceed 500 characters.').optional().nullable(),
});

export const donorRespondSchema = z.object({
  message: z
    .string({ required_error: 'Clarification message is required.' })
    .min(5, 'Clarification response must be at least 5 characters.')
    .max(500, 'Clarification response cannot exceed 500 characters.'),
  storageHistory: z.string().max(300).optional().nullable(),
  batchNumber: z
    .string()
    .min(3, 'Batch number must be at least 3 characters.')
    .max(50)
    .optional()
    .nullable(),
});

export const queueQuerySchema = z.object({
  tab: z.enum(['awaiting', 'mine', 'needs_info', 'all']).optional().default('awaiting'),
  priority: z.enum(['normal', 'medium', 'high', 'critical']).optional(),
  search: z.string().optional(),
  sort: z.enum(['oldest', 'expiry_soonest', 'newest']).optional().default('oldest'),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
});

export const historyQuerySchema = z.object({
  decision: z.enum(VERIFICATION_DECISION_ARRAY).optional(),
  search: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.string().optional().default('1'),
  limit: z.string().optional().default('10'),
});
