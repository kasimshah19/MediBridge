import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { ROLES } from '../config/constants.js';
import { reportLimiter } from '../config/rateLimits.js';
import { downloadReport } from '../controllers/report.controller.js';

const router = Router();

// Protect all reports: authenticated admin only, rate limited to 20/hr
router.use(protect);
router.use(authorize(ROLES.ADMIN));
router.use(reportLimiter);

router.get('/:type', downloadReport);

export default router;
