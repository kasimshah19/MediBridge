import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getMyTransfers,
  getTransferById,
  generateHandoverTokenController,
  lookupHandoverController,
  receiveTransferItemsController,
  downloadReceiptPdfController,
} from '../controllers/transfer.controller.js';

const router = Router();

router.use(authenticate);

// List transfers for current user (Donor or NGO)
router.get('/my', getMyTransfers);

// NGO token lookup & verification
router.post('/handover/lookup', lookupHandoverController);

// Details for a single transfer
router.get('/:id', getTransferById);

// Donor generates 15-min ephemeral handover token
router.post('/:id/handover-token', generateHandoverTokenController);

// NGO marks items received / rejected
router.post('/:id/receive', receiveTransferItemsController);

// Download PDF receipt
router.get('/:id/receipt.pdf', downloadReceiptPdfController);

export default router;
