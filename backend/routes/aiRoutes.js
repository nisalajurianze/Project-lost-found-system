// ============================================
// AI Routes
// ============================================

import express from 'express';
import { suggestItemDetails } from '../controllers/aiController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadSingle } from '../middlewares/uploadMiddleware.js';

const router = express.Router();

// Route for AI Image Suggestion
router.post('/suggest-details', protect, uploadSingle, suggestItemDetails);

export default router;
