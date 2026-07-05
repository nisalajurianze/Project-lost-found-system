// ============================================
// AI Routes
// ============================================

import express from 'express';
import rateLimit from 'express-rate-limit';
import { suggestItemDetails } from '../controllers/aiController.js';
import { optionalAuth, protect } from '../middlewares/authMiddleware.js';
import { uploadSingle } from '../middlewares/uploadMiddleware.js';

import { handleAIChat } from '../controllers/aiChatController.js';

const router = express.Router();
const aiChatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many AI chat requests. Please try again shortly.' },
});

// Route for AI Image Suggestion
router.post('/suggest-details', protect, uploadSingle, suggestItemDetails);

// Route for AI Chat Assistant (Publicly accessible)
router.post('/chat', aiChatLimiter, optionalAuth, handleAIChat);

export default router;
