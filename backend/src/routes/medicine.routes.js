import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getMedicineQr, getMedicineById } from '../controllers/medicine.controller.js';

const router = Router();

router.use(authenticate);

// QR details & images
router.get('/:medicineId/qr', getMedicineQr);

// Medicine details
router.get('/:medicineId', getMedicineById);

export default router;
