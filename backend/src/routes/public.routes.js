import { Router } from 'express';
import { getPublicStats, getPublicOrganizations } from '../controllers/public.controller.js';

const router = Router();

// Public routes (no authentication required)
router.get('/stats', getPublicStats);
router.get('/organizations', getPublicOrganizations);

export default router;

