import { z } from 'zod';
import {
  ORG_TYPE_ARRAY,
  ORG_DOC_TYPES_ARRAY,
  ORG_SERVICES_ARRAY,
} from '../config/constants.js';

// Indian 10-digit mobile number regex
const phoneRegex = /^[6-9]\d{9}$/;

// Indian 6-digit postal code regex
const pincodeRegex = /^\d{6}$/;

// India bounding box validation: Lat: 6° to 38° N, Lng: 68° to 98° E
const locationSchema = z.object({
  lat: z
    .number({ required_error: 'Latitude is required' })
    .min(6, 'Latitude must be within India (between 6.0 and 38.0)')
    .max(38, 'Latitude must be within India (between 6.0 and 38.0)'),
  lng: z
    .number({ required_error: 'Longitude is required' })
    .min(68, 'Longitude must be within India (between 68.0 and 98.0)')
    .max(98, 'Longitude must be within India (between 68.0 and 98.0)'),
});

export const createOrganizationSchema = z.object({
  name: z
    .string({ required_error: 'Organization name is required' })
    .trim()
    .min(2, 'Organization name must be at least 2 characters')
    .max(100, 'Organization name cannot exceed 100 characters'),
  type: z.enum(ORG_TYPE_ARRAY, {
    errorMap: () => ({
      message: 'Type must be either "ngo" or "charitable_clinic"',
    }),
  }),
  registrationNumber: z
    .string({ required_error: 'Registration number is required' })
    .trim()
    .min(3, 'Registration number must be at least 3 characters')
    .max(50, 'Registration number cannot exceed 50 characters'),
  contactPerson: z
    .string({ required_error: 'Contact person name is required' })
    .trim()
    .min(2, 'Contact person name must be at least 2 characters')
    .max(60, 'Contact person name cannot exceed 60 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid official email address')
    .toLowerCase(),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .trim()
    .regex(phoneRegex, 'Please provide a valid 10-digit Indian phone number'),
  address: z
    .string({ required_error: 'Street address is required' })
    .trim()
    .min(5, 'Street address must be at least 5 characters'),
  city: z
    .string({ required_error: 'City is required' })
    .trim()
    .min(2, 'City must be at least 2 characters'),
  state: z
    .string({ required_error: 'State is required' })
    .trim()
    .min(2, 'State must be at least 2 characters'),
  pincode: z
    .string({ required_error: 'Pincode is required' })
    .trim()
    .regex(pincodeRegex, 'Pincode must be a valid 6-digit Indian postal code'),
  description: z
    .string()
    .trim()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .default(''),
  website: z
    .string()
    .trim()
    .optional()
    .default('')
    .refine((val) => !val || /^https?:\/\/.+/i.test(val), {
      message: 'Website must be a valid URL starting with http:// or https://',
    }),
  servicesOffered: z.array(z.enum(ORG_SERVICES_ARRAY)).optional().default([]),
  beneficiariesPerMonth: z.coerce.number().min(0).optional().default(0),
  operatingHours: z.string().trim().optional().default(''),
  location: locationSchema,
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  type: z.enum(ORG_TYPE_ARRAY).optional(),
  registrationNumber: z.string().trim().min(3).max(50).optional(),
  contactPerson: z.string().trim().min(2).max(60).optional(),
  email: z.string().trim().email().toLowerCase().optional(),
  phone: z.string().trim().regex(phoneRegex).optional(),
  address: z.string().trim().min(5).optional(),
  city: z.string().trim().min(2).optional(),
  state: z.string().trim().min(2).optional(),
  pincode: z.string().trim().regex(pincodeRegex).optional(),
  description: z.string().trim().max(500).optional(),
  website: z
    .string()
    .trim()
    .optional()
    .refine((val) => !val || /^https?:\/\/.+/i.test(val), {
      message: 'Website must be a valid URL starting with http:// or https://',
    }),
  servicesOffered: z.array(z.enum(ORG_SERVICES_ARRAY)).optional(),
  beneficiariesPerMonth: z.coerce.number().min(0).optional(),
  operatingHours: z.string().trim().optional(),
  location: locationSchema.optional(),
});

export const uploadDocumentSchema = z.object({
  type: z.enum(ORG_DOC_TYPES_ARRAY, {
    errorMap: () => ({
      message: `Document type must be one of: ${ORG_DOC_TYPES_ARRAY.join(', ')}`,
    }),
  }),
});

export default {
  createOrganizationSchema,
  updateOrganizationSchema,
  uploadDocumentSchema,
};
