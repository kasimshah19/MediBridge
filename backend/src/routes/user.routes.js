import { Router } from 'express';
import {
  updateMe,
  changePassword,
  getMyAuditLogs,
} from '../controllers/user.controller.js';
import protect from '../middleware/auth.middleware.js';
import validate from '../middleware/validate.middleware.js';
import {
  updateProfileSchema,
  changePasswordSchema,
} from '../validators/user.validator.js';

const router = Router();

// All user routes require authentication
router.use(protect);

router.patch('/me', validate(updateProfileSchema), updateMe);
router.patch('/me/password', validate(changePasswordSchema), changePassword);
router.get('/me/audit', getMyAuditLogs);

export default router;
