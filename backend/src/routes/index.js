import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import organizationRoutes from './organization.routes.js';
import donationRoutes from './donation.routes.js';
import medicineRoutes from './medicine.routes.js';
import verificationRoutes from './verification.routes.js';
import requestRoutes from './request.routes.js';
import transferRoutes from './transfer.routes.js';
import adminRoutes from './admin.routes.js';
import notificationRoutes from './notification.routes.js';
import geocodeRoutes from './geocode.routes.js';
import publicRoutes from './public.routes.js';

const router = Router();

// Mount all route modules under /api
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/organizations', organizationRoutes);
router.use('/donations', donationRoutes);
router.use('/medicines', medicineRoutes);
router.use('/verifications', verificationRoutes);
router.use('/requests', requestRoutes);
router.use('/transfers', transferRoutes);
router.use('/admin', adminRoutes);
router.use('/notifications', notificationRoutes);
router.use('/geocode', geocodeRoutes);
router.use('/public', publicRoutes);

export default router;
