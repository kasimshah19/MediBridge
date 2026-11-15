import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { searchLocation, reverseGeocode } from '../controllers/geocode.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = Router();

// Strict user-level rate limit for geocoding proxy (20 req / 1 min)
const geocodeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many geocoding queries. Please slow down your search.',
  },
});

router.use(protect);
router.use(geocodeLimiter);

router.get('/search', searchLocation);
router.get('/reverse', reverseGeocode);

export default router;

