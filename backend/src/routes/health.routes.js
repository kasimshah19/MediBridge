import { Router } from 'express';
import { getHealth, getReadiness } from '../controllers/health.controller.js';

const router = Router();

// GET /api/health - Health check endpoint
router.get('/', getHealth);

// GET /api/health/ready - Readiness probe
router.get('/ready', getReadiness);

export default router;

