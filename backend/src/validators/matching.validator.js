import { z } from 'zod';
import mongoose from 'mongoose';
import {
  MEDICINE_UNIT_ARRAY,
  REQUIREMENT_URGENCY,
  REQUIREMENT_URGENCY_ARRAY,
  CONTROLLED_SUBSTANCE_KEYWORDS,
  COLD_CHAIN_KEYWORDS,
  GEO_RADII_KM,
  DEFAULT_RADIUS_KM,
} from '../config/constants.js';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const isValidObjectId = (val) => Boolean(val && objectIdRegex.test(val));

const INJECTION_KEYWORDS = ['injection', 'inj', 'infusion', 'ampoule', 'iv drip'];

export const checkNonCompliantKeywords = (text) => {
  if (!text) return null;
  const lower = text.toLowerCase();

  for (const kw of CONTROLLED_SUBSTANCE_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      return {
        type: 'controlled',
        message: `Medicines containing controlled substances or narcotics (${kw}) cannot be requested for donation.`,
      };
    }
  }

  for (const kw of COLD_CHAIN_KEYWORDS) {
    if (lower.includes(kw.toLowerCase())) {
      return {
        type: 'cold_chain',
        message: `Cold-chain items requiring 2-8°C storage (${kw}) cannot be requested through standard donation matching.`,
      };
    }
  }

  for (const kw of INJECTION_KEYWORDS) {
    if (lower.includes(kw)) {
      return {
        type: 'injection',
        message: `Injections and intravenous formulations cannot be requested for donation under safety compliance rules.`,
      };
    }
  }

  return null;
};

export const createRequirementSchema = z
  .object({
    medicineName: z
      .string()
      .min(2, 'Medicine name must be at least 2 characters')
      .max(80, 'Medicine name cannot exceed 80 characters')
      .trim(),
    genericName: z
      .string()
      .max(80, 'Generic name cannot exceed 80 characters')
      .trim()
      .optional()
      .default(''),
    quantityNeeded: z
      .number({ invalid_type_error: 'Quantity needed must be a number' })
      .int('Quantity needed must be an integer')
      .min(1, 'Quantity needed must be at least 1')
      .max(10000, 'Quantity needed cannot exceed 10,000'),
    unit: z.enum(MEDICINE_UNIT_ARRAY).default('strip'),
    urgency: z.enum(REQUIREMENT_URGENCY_ARRAY).default(REQUIREMENT_URGENCY.ROUTINE),
    description: z
      .string()
      .max(500, 'Description cannot exceed 500 characters')
      .trim()
      .optional()
      .default(''),
    neededBy: z.coerce.date().optional(),
  })
  .superRefine((data, ctx) => {
    // Compliance keyword check on medicineName
    const nameCheck = checkNonCompliantKeywords(data.medicineName);
    if (nameCheck) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['medicineName'],
        message: nameCheck.message,
      });
    }

    // Compliance keyword check on genericName
    if (data.genericName) {
      const genericCheck = checkNonCompliantKeywords(data.genericName);
      if (genericCheck) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['genericName'],
          message: genericCheck.message,
        });
      }
    }

    // NeededBy date check (must be today or future)
    if (data.neededBy) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(data.neededBy) < today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['neededBy'],
          message: 'Needed-by date must be today or in the future',
        });
      }
    }
  });

export const updateRequirementSchema = z.object({
  quantityNeeded: z
    .number()
    .int()
    .min(1, 'Quantity needed must be at least 1')
    .max(10000, 'Quantity needed cannot exceed 10,000')
    .optional(),
  unit: z.enum(MEDICINE_UNIT_ARRAY).optional(),
  urgency: z.enum(REQUIREMENT_URGENCY_ARRAY).optional(),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .trim()
    .optional(),
  neededBy: z.coerce.date().optional(),
});

export const closeRequirementSchema = z.object({
  reason: z
    .string()
    .max(200, 'Reason cannot exceed 200 characters')
    .trim()
    .optional()
    .default('Fulfilled or no longer needed'),
});

export const createClaimSchema = z.object({
  donationId: z
    .string()
    .refine(isValidObjectId, { message: 'Valid donation ID required' }),
  medicineIds: z
    .array(z.string().refine(isValidObjectId, { message: 'Valid medicine ID required' }))
    .min(1, 'At least 1 medicine must be selected for the claim'),
  requirementId: z
    .string()
    .refine(isValidObjectId, { message: 'Valid requirement ID required' })
    .optional(),
  organizationId: z
    .string()
    .refine(isValidObjectId, { message: 'Valid organization ID required' })
    .optional(),
  message: z
    .string()
    .max(300, 'Message cannot exceed 300 characters')
    .trim()
    .optional()
    .default(''),
});

export const claimAcceptSchema = z.object({
  note: z
    .string()
    .max(300, 'Note cannot exceed 300 characters')
    .trim()
    .optional()
    .default(''),
});

export const claimDeclineSchema = z.object({
  reason: z
    .string()
    .min(5, 'Decline reason must be at least 5 characters')
    .max(300, 'Decline reason cannot exceed 300 characters')
    .trim(),
});

export const claimCancelSchema = z.object({
  reason: z
    .string()
    .min(10, 'Cancellation reason must be at least 10 characters')
    .max(300, 'Cancellation reason cannot exceed 300 characters')
    .trim(),
});

export const nearbyQuerySchema = z.object({
  lat: z.coerce
    .number()
    .min(6, 'Latitude must be within India (6° to 38°)')
    .max(38, 'Latitude must be within India (6° to 38°)'),
  lng: z.coerce
    .number()
    .min(68, 'Longitude must be within India (68° to 98°)')
    .max(98, 'Longitude must be within India (68° to 98°)'),
  radiusKm: z.coerce
    .number()
    .optional()
    .default(DEFAULT_RADIUS_KM)
    .refine((r) => GEO_RADII_KM.includes(r), {
      message: `Radius must be one of: ${GEO_RADII_KM.join(', ')} km`,
    }),
  type: z.string().optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(10),
});
