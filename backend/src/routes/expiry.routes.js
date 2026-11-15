import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  getExpirySummary,
  getExpiryItems,
  getExpiryTimeline,
} from '../controllers/expiry.controller.js';
import { expiryQuerySchema } from '../validators/expiry.validator.js';

const router = Router();

// All expiry routes require an authenticated session.
// Role-based scoping (donor, admin, approved pharmacist) is enforced inside the controller.
router.use(protect);

router.get('/summary', getExpirySummary);
router.get('/items', validate(expiryQuerySchema, 'query'), getExpiryItems);
router.get('/timeline', getExpiryTimeline);

export default router;

