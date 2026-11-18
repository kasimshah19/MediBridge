import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerifiedNgo } from '../middleware/role.middleware.js';
import { getNgoSummary, getAvailableMedicines } from '../controllers/ngo.controller.js';

const router = express.Router();

router.get('/summary', authenticate, requireVerifiedNgo, getNgoSummary);
router.get('/available', authenticate, requireVerifiedNgo, getAvailableMedicines);

export default router;
