import { z } from 'zod';

export const reviewOrgSchema = z
  .object({
    decision: z.enum(['verified', 'rejected'], {
      errorMap: () => ({ message: 'Decision must be either "verified" or "rejected"' }),
    }),
    note: z.string().trim().optional().default(''),
  })
  .refine(
    (data) => {
      if (data.decision === 'rejected') {
        return Boolean(data.note && data.note.length >= 10);
      }
      return true;
    },
    {
      message: 'A rejection reason note of at least 10 characters is required when rejecting an organization',
      path: ['note'],
    }
  );

export const reviewUserSchema = z
  .object({
    decision: z.enum(['approved', 'rejected'], {
      errorMap: () => ({ message: 'Decision must be either "approved" or "rejected"' }),
    }),
    note: z.string().trim().optional().default(''),
  })
  .refine(
    (data) => {
      if (data.decision === 'rejected') {
        return Boolean(data.note && data.note.length >= 10);
      }
      return true;
    },
    {
      message: 'A rejection reason note of at least 10 characters is required when rejecting an applicant',
      path: ['note'],
    }
  );

export const updateUserStatusSchema = z
  .object({
    action: z.enum(['suspend', 'reactivate', 'block'], {
      errorMap: () => ({ message: 'Action must be "suspend", "reactivate", or "block"' }),
    }),
    reason: z.string().trim().optional().default(''),
  })
  .refine(
    (data) => {
      if (['suspend', 'block'].includes(data.action)) {
        return Boolean(data.reason && data.reason.length >= 10);
      }
      return true;
    },
    {
      message: 'A reason note of at least 10 characters is required when suspending or blocking a user',
      path: ['reason'],
    }
  );

export default {
  reviewOrgSchema,
  reviewUserSchema,
  updateUserStatusSchema,
};
