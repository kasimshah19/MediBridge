import express from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import {
  createClaimSchema,
  claimAcceptSchema,
  claimDeclineSchema,
  claimCancelSchema,
} from '../validators/matching.validator.js';
import {
  createClaim,
  acceptClaim,
  declineClaim,
  withdrawClaim,
  cancelClaim,
  getMyClaims,
  getClaimById,
  getHandoverDetails,
} from '../controllers/claim.controller.js';

const router = express.Router();

router.post('/', authenticate, validate(createClaimSchema, 'body'), createClaim);
router.get('/my', authenticate, getMyClaims);
router.get('/:id', authenticate, getClaimById);
router.get('/:id/handover-details', authenticate, getHandoverDetails);
router.post('/:id/accept', authenticate, validate(claimAcceptSchema, 'body'), acceptClaim);
router.post('/:id/decline', authenticate, validate(claimDeclineSchema, 'body'), declineClaim);
router.post('/:id/withdraw', authenticate, withdrawClaim);
router.post('/:id/cancel', authenticate, validate(claimCancelSchema, 'body'), cancelClaim);

export default router;
