import { Router } from 'express';
import {
  register,
  login,
  logout,
  getMe,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller.js';
import protect from '../middleware/auth.middleware.js';
import authorizeRoles from '../middleware/role.middleware.js';
import validate from '../middleware/validate.middleware.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator.js';
import { ROLES } from '../config/constants.js';

const router = Router();

// Public auth endpoints with strict rate limiting
router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), forgotPassword);
router.post('/reset-password/:token', authLimiter, validate(resetPasswordSchema), resetPassword);

// Authenticated session endpoints
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

// RBAC Test endpoints (used for verification & test suite)
router.get('/test/donor', protect, authorizeRoles(ROLES.DONOR), (req, res) => {
  res.json({ success: true, message: 'Welcome donor', user: req.user.name });
});

router.get('/test/pharmacist', protect, authorizeRoles(ROLES.PHARMACIST), (req, res) => {
  res.json({ success: true, message: 'Welcome pharmacist', user: req.user.name });
});

router.get('/test/ngo', protect, authorizeRoles(ROLES.NGO), (req, res) => {
  res.json({ success: true, message: 'Welcome ngo', user: req.user.name });
});

router.get('/test/admin', protect, authorizeRoles(ROLES.ADMIN), (req, res) => {
  res.json({ success: true, message: 'Welcome admin', user: req.user.name });
});

export default router;
