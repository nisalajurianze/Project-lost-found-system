// ============================================
// Auth Routes
// Mapping authentication endpoints with rate limits & validations
// ============================================

import express from 'express';
import {
  register,
  verifyEmail,
  login,
  googleLogin,
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
import RedisStore from 'rate-limit-redis';

// Helper for Redis store
const createRedisStore = (prefix) => new RedisStore({
  prefix,
  sendCommand: async (...args) => {
    const client = (await import('../config/redis.js')).getRedisClient();
    if (client) return client.call(...args);
    throw new Error('Redis not available');
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 mins
  max: 20,
  store: createRedisStore('rl-auth:'),
  message: { success: false, message: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  store: createRedisStore('rl-login:'),
  message: { success: false, message: 'Too many login attempts. Please try again after 15 minutes.' }
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  store: createRedisStore('rl-pwd:'),
  message: { success: false, message: 'Too many password reset requests. Please try again after an hour.' }
});

const router = express.Router();

router.post('/register', authLimiter, registerValidator, validate, register);
router.get('/verify-email', verifyEmail);
router.post('/login', loginLimiter, loginValidator, validate, login);
router.post('/google', loginLimiter, googleLogin);
router.get('/refresh-token', refreshToken);
router.post('/refresh-token', refreshToken);
router.post('/logout', protect, logout);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordValidator, validate, forgotPassword);
router.post('/reset-password', passwordResetLimiter, resetPasswordValidator, validate, resetPassword);
router.get('/me', protect, getMe);

export default router;
