import express from 'express';
import { getNearbyOrganizations } from '../controllers/geo.controller.js';
import { validate } from '../middleware/validate.middleware.js';
import { nearbyQuerySchema } from '../validators/matching.validator.js';

const router = express.Router();

router.get('/organizations/nearby', validate(nearbyQuerySchema, 'query'), getNearbyOrganizations);

export default router;
