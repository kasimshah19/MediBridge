import { Router } from 'express';
import {
  getPublicStats,
  getPublicOrganizations,
  getPublicConfig,
} from '../controllers/public.controller.js';

const router = Router();

// Public routes (no authentication required)
router.get('/stats', getPublicStats);
router.get('/organizations', getPublicOrganizations);
router.get('/config', getPublicConfig);

export default router;

