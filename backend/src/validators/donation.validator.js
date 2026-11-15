import { z } from 'zod';
import {
  MEDICINE_TYPE_ARRAY,
  PACKAGING_CONDITION_ARRAY,
  STORAGE_CONDITION_ARRAY,
  MEDICINE_UNIT_ARRAY,
} from '../config/constants.js';

const indiaPhoneRegex = /^[6-9]\d{9}$/;
const indiaPincodeRegex = /^[1-9]\d{5}$/;

const medicineItemSchema = z.object({
  _id: z.string().optional(),
  name: z.string().min(2, 'Medicine name must be at least 2 characters').max(100),
  genericName: z.string().max(100).optional().default(''),
  manufacturer: z.string().max(100).optional().default(''),
  batchNumber: z.string().min(1, 'Batch number is required').max(50),
  manufacturingDate: z.coerce.date().nullable().optional(),
  expiryDate: z.union([z.string().min(4), z.coerce.date()]),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unit: z.enum(MEDICINE_UNIT_ARRAY).default('strip'),
  unitsPerPack: z.number().int().positive().nullable().optional(),
  medicineType: z.enum(MEDICINE_TYPE_ARRAY).default('tablet'),
  packagingCondition: z.enum(PACKAGING_CONDITION_ARRAY).default('sealed'),
  storageCondition: z.enum(STORAGE_CONDITION_ARRAY).default('room_temperature'),
  storageHistory: z.string().max(300).optional().default(''),
  isPrescriptionOnly: z.boolean().optional().default(false),
});

export const createDonationSchema = z.object({
  items: z
    .array(medicineItemSchema)
    .min(1, 'At least 1 medicine item is required')
    .max(10, 'Maximum 10 medicines allowed per donation'),
  pickupAddress: z.object({
    line1: z.string().min(3, 'Address line is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    pincode: z.string().regex(indiaPincodeRegex, 'Valid 6-digit Indian PIN code required'),
  }),
  location: z.object({
    lat: z
      .number()
      .min(6, 'Latitude must be within India (6° to 38°)')
      .max(38, 'Latitude must be within India (6° to 38°)'),
    lng: z
      .number()
      .min(68, 'Longitude must be within India (68° to 98°)')
      .max(98, 'Longitude must be within India (68° to 98°)'),
  }),
  contactPhone: z.string().regex(indiaPhoneRegex, 'Valid 10-digit Indian phone number required'),
  preferredTimeSlot: z.string().max(100).optional().default(''),
  notes: z.string().max(300).optional().default(''),
});

export const updateDonationSchema = createDonationSchema.partial().extend({
  items: z.array(medicineItemSchema).min(1).max(10).optional(),
});

export const submitDonationSchema = z.object({
  declarations: z.object({
    sealedAndUnused: z.literal(true, {
      errorMap: () => ({ message: 'You must declare that medicines are sealed and unused' }),
    }),
    storedProperly: z.literal(true, {
      errorMap: () => ({ message: 'You must declare proper room temperature storage' }),
    }),
    notControlled: z.literal(true, {
      errorMap: () => ({ message: 'You must declare items are not controlled substances' }),
    }),
    genuineInfo: z.literal(true, {
      errorMap: () => ({ message: 'You must certify that all provided details are genuine' }),
    }),
  }),
});

export const cancelDonationSchema = z.object({
  reason: z.string().min(5, 'Cancellation reason must be at least 5 characters').max(300),
});

export default {
  createDonationSchema,
  updateDonationSchema,
  submitDonationSchema,
  cancelDonationSchema,
};
