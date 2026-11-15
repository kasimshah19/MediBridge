import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { protect } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { uploadPhotoMiddleware } from '../middleware/upload.middleware.js';
import {
  createDraftDonation,
  getMyDonations,
  getMyDonationsSummary,
  getDonationById,
  updateDraftDonation,
  deleteDraftDonation,
  uploadItemPhoto,
  deleteItemPhoto,
  streamItemPhoto,
  submitDonation,
  cancelDonation,
} from '../controllers/donation.controller.js';
import {
  createDonationSchema,
  updateDonationSchema,
  submitDonationSchema,
  cancelDonationSchema,
} from '../validators/donation.validator.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// Rate limiters
const photoUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 60,
  message: {
    success: false,
    message: 'Too many photo uploads. Please wait a few minutes before trying again.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: {
    success: false,
    message: 'Too many donation submissions. Please wait before submitting more.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// 1. Streaming photo (Allowed for owner donor, admin, or approved pharmacist - authorization verified inside controller)
router.get(
  '/:donationId/items/:itemId/photos/:photoId/file',
  protect,
  streamItemPhoto
);

// 2. Fetch specific donation details (Owner, Admin, or Approved Pharmacist)
router.get('/:id', protect, getDonationById);

// 3. Donor-only management routes
router.use(protect, authorizeRoles(ROLES.DONOR));

// Draft operations
router.post('/', validate(createDonationSchema), createDraftDonation);
router.get('/my/summary', getMyDonationsSummary);
router.get('/my', getMyDonations);
router.patch('/:id', validate(updateDonationSchema), updateDraftDonation);
router.delete('/:id', deleteDraftDonation);

// Photo upload & deletion
router.post(
  '/:id/items/:itemId/photos',
  photoUploadLimiter,
  uploadPhotoMiddleware('photo'),
  uploadItemPhoto
);
router.delete('/:id/items/:itemId/photos/:photoId', deleteItemPhoto);

// Submission & cancellation
router.post('/:id/submit', submitLimiter, submitDonation);
router.post('/:id/cancel', validate(cancelDonationSchema), cancelDonation);

export default router;
