// ============================================
// Feedback Routes
// User feedback & admin review response routes
// ============================================

import express from 'express';
import {
  createFeedback,
  getFeedback,
  respondToFeedback
} from '../controllers/feedbackController.js';
import { protect } from '../middlewares/authMiddleware.js';
import authorize from '../middlewares/roleMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import { createFeedbackValidator, mongoIdParam, feedbackQueryValidator, feedbackResponseValidator } from '../utils/validators.js';

const router = express.Router();

// Submit feedback (User role)
router.post('/', protect, createFeedbackValidator, validate, createFeedback);

// View & Respond (Admin only)
router.get('/', protect, authorize('admin'), feedbackQueryValidator, validate, getFeedback);
router.put('/:id/respond', protect, authorize('admin'), mongoIdParam, feedbackResponseValidator, validate, respondToFeedback);

export default router;
