import { Router } from 'express';
import { protect } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { ROLES } from '../config/constants.js';
import { analyticsLimiter } from '../config/rateLimits.js';
import {
  getOverview,
  getTimeSeries,
  getFunnel,
  getRejections,
  getExpiry,
  getTopMedicines,
  getOrganizations,
  getPharmacists,
  getGeo,
  getSystem,
} from '../controllers/analytics.controller.js';

const router = Router();

// Protect all analytics endpoints: authenticated admin only
router.use(protect);
router.use(authorize(ROLES.ADMIN));
router.use(analyticsLimiter);

router.get('/overview', getOverview);
router.get('/timeseries', getTimeSeries);
router.get('/funnel', getFunnel);
router.get('/rejections', getRejections);
router.get('/expiry', getExpiry);
router.get('/top-medicines', getTopMedicines);
router.get('/organizations', getOrganizations);
router.get('/pharmacists', getPharmacists);
router.get('/geo', getGeo);
router.get('/system', getSystem);

export default router;
