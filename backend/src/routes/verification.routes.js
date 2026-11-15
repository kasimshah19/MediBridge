import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { requireApprovedPharmacist } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  decisionSchema,
  queueQuerySchema,
  historyQuerySchema,
} from '../validators/verification.validator.js';
import {
  getSummary,
  getQueue,
  getDonationDetail,
  claim,
  release,
  decide,
  getHistory,
} from '../controllers/verification.controller.js';

const router = Router();

// Strict RBAC: All verification routes require authentication and APPROVED pharmacist status
router.use(protect, requireApprovedPharmacist);

router.get('/summary', getSummary);
router.get('/queue', validate(queueQuerySchema, 'query'), getQueue);
router.get('/donations/:id', getDonationDetail);
router.post('/donations/:id/claim', claim);
router.post('/donations/:id/release', release);
router.post('/items/:medicineId/decision', validate(decisionSchema), decide);
router.get('/history', validate(historyQuerySchema, 'query'), getHistory);

export default router;
