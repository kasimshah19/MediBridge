import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { getMedicineCustody, getDonationCustody } from '../controllers/custody.controller.js';

const router = Router();

router.use(authenticate);

router.get('/medicines/:medicineId', getMedicineCustody);
router.get('/donations/:id', getDonationCustody);

export default router;
