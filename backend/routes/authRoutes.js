// ============================================
// Auth Routes
// Mapping authentication endpoints with rate limits & validations
// ============================================

import express from 'express';
import {
  register,
  verifyEmail,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  getMe
} from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import {
  registerValidator,
  loginValidator,
  forgotPasswordValidator,
  resetPasswordValidator
} from '../utils/validators.js';

// Specific rate limiters for auth endpoints
import rateLimit from 'express-rate-limit';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 20,
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' }
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  message: { success: false, message: 'Too many password reset requests. Please try again after an hour.' }
});

const router = express.Router();

router.post('/register', authLimiter, registerValidator, validate, register);
router.get('/verify-email', verifyEmail);
router.post('/login', loginLimiter, loginValidator, validate, login);
router.get('/refresh-token', refreshToken);
router.post('/logout', protect, logout);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidator, validate, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPasswordValidator, validate, resetPassword);
router.get('/me', protect, getMe);

export default router;
