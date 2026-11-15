import { Router } from 'express';
import {
  getOrganizations,
  getOrganizationById,
  reviewOrganization,
  getUsers,
  reviewUser,
  getOverview,
} from '../controllers/admin.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { authorizeRoles } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { reviewOrgSchema, reviewUserSchema } from '../validators/admin.validator.js';
import { runJobSchema } from '../validators/expiry.validator.js';
import { getAdminJobRuns, runAdminExpiryCheck } from '../controllers/expiry.controller.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// Strict RBAC: All admin routes require authentication and ADMIN role
router.use(protect, authorizeRoles(ROLES.ADMIN));

router.get('/overview', getOverview);

// Organization management
router.get('/organizations', getOrganizations);
router.get('/organizations/:id', getOrganizationById);
router.patch('/organizations/:id/review', validate(reviewOrgSchema), reviewOrganization);

// User / Pharmacist management
router.get('/users', getUsers);
router.patch('/users/:id/review', validate(reviewUserSchema), reviewUser);

// Expiry scheduled job management
router.get('/jobs/expiry', getAdminJobRuns);
router.post('/jobs/expiry/run', validate(runJobSchema), runAdminExpiryCheck);

export default router;
