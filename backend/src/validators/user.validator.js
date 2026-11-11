import { z } from 'zod';

const passwordPolicy = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

const phoneRegex = /^[6-9]\d{9}$/;

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2).max(60).optional(),
  phone: z.string().trim().regex(phoneRegex, 'Please provide a valid 10-digit Indian mobile number').optional(),
  city: z.string().trim().min(2).optional(),
  state: z.string().trim().optional(),
  address: z.string().trim().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),

  // Pharmacist update fields
  pharmacistProfile: z
    .object({
      licenseNumber: z.string().trim().optional(),
      pharmacyName: z.string().trim().optional(),
      registrationState: z.string().trim().optional(),
      experienceYears: z.coerce.number().min(0).optional(),
    })
    .optional(),

  // NGO update fields
  ngoContact: z
    .object({
      organizationName: z.string().trim().optional(),
      designation: z.string().trim().optional(),
    })
    .optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string({ required_error: 'Current password is required' }),
    newPassword: passwordPolicy,
    confirmPassword: z.string({ required_error: 'Please confirm your new password' }),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'New password and confirm password do not match',
    path: ['confirmPassword'],
  });
