import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { requireVerifiedNgo } from '../middleware/role.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createRequirementSchema,
  updateRequirementSchema,
  closeRequirementSchema,
} from '../validators/matching.validator.js';
import {
  createRequirement,
  getMyRequirements,
  getRequirementById,
  updateRequirement,
  closeRequirement,
} from '../controllers/requirement.controller.js';

const router = express.Router();

router.post(
  '/',
  authenticate,
  requireVerifiedNgo,
  validate(createRequirementSchema, 'body'),
  createRequirement
);

router.get('/my', authenticate, requireVerifiedNgo, getMyRequirements);

router.get('/:id', authenticate, getRequirementById);

router.patch(
  '/:id',
  authenticate,
  requireVerifiedNgo,
  validate(updateRequirementSchema, 'body'),
  updateRequirement
);

router.post(
  '/:id/close',
  authenticate,
  requireVerifiedNgo,
  validate(closeRequirementSchema, 'body'),
  closeRequirement
);

export default router;
