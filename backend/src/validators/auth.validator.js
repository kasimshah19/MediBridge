import { z } from 'zod';
import { ROLES } from '../config/constants.js';

// Password policy regex: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
const passwordPolicy = z
  .string()
  .min(8, 'Password must be at least 8 characters long')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Indian 10-digit mobile number regex
const phoneRegex = /^[6-9]\d{9}$/;

export const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(60, 'Name cannot exceed 60 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .email('Please provide a valid email address')
      .toLowerCase(),
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .regex(phoneRegex, 'Please provide a valid 10-digit Indian mobile number'),
    password: passwordPolicy,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
    role: z.enum([ROLES.DONOR, ROLES.PHARMACIST, ROLES.NGO], {
      errorMap: () => ({
        message: 'Role must be one of: donor, pharmacist, or ngo',
      }),
    }),
    city: z
      .string({ required_error: 'City is required' })
      .trim()
      .min(2, 'City must be at least 2 characters'),
    state: z.string().trim().optional(),
    address: z.string().trim().optional(),

    // Pharmacist specific fields
    licenseNumber: z.string().trim().optional(),
    pharmacyName: z.string().trim().optional(),
    registrationState: z.string().trim().optional(),
    experienceYears: z.coerce.number().min(0).optional(),

    // NGO specific fields
    organizationName: z.string().trim().optional(),
    designation: z.string().trim().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine(
    (data) => {
      if (data.role === ROLES.PHARMACIST) {
        return Boolean(data.licenseNumber && data.pharmacyName && data.registrationState);
      }
      return true;
    },
    {
      message: 'License number, pharmacy name, and registration state are required for pharmacists',
      path: ['licenseNumber'],
    }
  )
  .refine(
    (data) => {
      if (data.role === ROLES.NGO) {
        return Boolean(data.organizationName && data.designation);
      }
      return true;
    },
    {
      message: 'Organization name and designation are required for NGOs',
      path: ['organizationName'],
    }
  );

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password cannot be empty'),
  rememberMe: z.boolean().optional().default(false),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address')
    .toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    password: passwordPolicy,
    confirmPassword: z.string({ required_error: 'Please confirm your password' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });
