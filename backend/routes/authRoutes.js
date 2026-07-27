import express from 'express';
import rateLimit from 'express-rate-limit';
import { register, verifyEmail, resendVerification, login, googleLogin, refreshToken, logout, forgotPassword, resetPassword, getMe } from '../controllers/authController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { issueCsrfToken } from '../middlewares/csrfMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import { registerValidator, loginValidator, forgotPasswordValidator, verifyEmailValidator, googleLoginValidator, resetPasswordValidator } from '../utils/validators.js';

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false });
const resetLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, standardHeaders: true, legacyHeaders: false });
const router = express.Router();

router.get('/csrf', issueCsrfToken);
router.post('/register', authLimiter, registerValidator, validate, register);
router.post('/verify-email', authLimiter, verifyEmailValidator, validate, verifyEmail);
router.post('/resend-verification', resetLimiter, forgotPasswordValidator, validate, resendVerification);
router.post('/login', loginLimiter, loginValidator, validate, login);
router.post('/google', loginLimiter, googleLoginValidator, validate, googleLogin);
router.post('/refresh-token', authLimiter, refreshToken);
router.post('/logout', logout);
router.post('/forgot-password', resetLimiter, forgotPasswordValidator, validate, forgotPassword);
router.post('/reset-password', resetLimiter, resetPasswordValidator, validate, resetPassword);
router.get('/me', protect, getMe);

export default router;
