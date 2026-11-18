import { Router } from 'express';
import {
  getPublicStats,
  getPublicOrganizations,
  getPublicConfig,
  verifyMedicinePublic,
} from '../controllers/public.controller.js';

const router = Router();

// Public routes (no authentication required)
router.get('/stats', getPublicStats);
router.get('/organizations', getPublicOrganizations);
router.get('/config', getPublicConfig);
router.get('/verify/:medicineId', verifyMedicinePublic);

export default router;
