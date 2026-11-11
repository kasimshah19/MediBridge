import { z } from 'zod';
import { ORG_TYPE } from '../config/constants.js';

export const createOrganizationSchema = z.object({
  name: z.string({ required_error: 'Organization name is required' }).trim().min(3),
  type: z.enum([ORG_TYPE.NGO, ORG_TYPE.CHARITABLE_CLINIC], {
    errorMap: () => ({ message: 'Type must be ngo or charitable_clinic' }),
  }),
  registrationNumber: z
    .string({ required_error: 'Registration/Certificate number is required' })
    .trim()
    .min(3),
  contactPerson: z
    .string({ required_error: 'Contact person name is required' })
    .trim()
    .min(2),
  email: z.string().trim().email('Valid email address is required'),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian phone number'),
  address: z.string({ required_error: 'Physical address is required' }).trim().min(5),
  city: z.string({ required_error: 'City is required' }).trim().min(2),
  state: z.string({ required_error: 'State is required' }).trim().min(2),
  pincode: z
    .string({ required_error: 'Pincode is required' })
    .trim()
    .regex(/^\d{6}$/, 'Enter a valid 6-digit Indian PIN code'),
  latitude: z.coerce.number().min(-90).max(90).optional().default(0),
  longitude: z.coerce.number().min(-180).max(180).optional().default(0),
});

export const updateOrganizationSchema = z.object({
  name: z.string().trim().min(3).optional(),
  contactPerson: z.string().trim().min(2).optional(),
  phone: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian phone number')
    .optional(),
  address: z.string().trim().min(5).optional(),
  city: z.string().trim().min(2).optional(),
  state: z.string().trim().min(2).optional(),
  pincode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'Enter a valid 6-digit Indian PIN code')
    .optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
});
