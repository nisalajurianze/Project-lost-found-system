// ============================================
// AI Routes
// ============================================

import express from 'express';
import { suggestItemDetails } from '../controllers/aiController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadSingle } from '../middlewares/uploadMiddleware.js';

import { handleAIChat } from '../controllers/aiChatController.js';

const router = express.Router();

// Route for AI Image Suggestion
router.post('/suggest-details', protect, uploadSingle, suggestItemDetails);

// Route for AI Chat Assistant
router.post('/chat', protect, handleAIChat);

export default router;
