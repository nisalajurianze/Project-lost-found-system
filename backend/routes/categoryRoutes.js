// ============================================
// Category Routes
// Categories endpoints with admin protection
// ============================================

import express from 'express';
import rateLimit from 'express-rate-limit';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  autoCreateCategory
} from '../controllers/categoryController.js';
import { protect } from '../middlewares/authMiddleware.js';
import authorize from '../middlewares/roleMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import {
  createCategoryValidator,
  updateCategoryValidator,
  mongoIdParam
} from '../utils/validators.js';

const router = express.Router();
const reportAutoCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many new category suggestions. Please try again later.' },
});

// Publicly viewable categories list
router.get('/', getCategories);

// AI report suggestions may create a bounded, validated category for the
// authenticated reporter. Manual taxonomy management remains admin-only.
router.post('/report-auto-create', protect, reportAutoCreateLimiter, createCategoryValidator, validate, autoCreateCategory);
router.post('/auto-create', protect, authorize('admin'), autoCreateCategory);

// Admin-only management endpoints
router.post('/', protect, authorize('admin'), createCategoryValidator, validate, createCategory);
router.put('/:id', protect, authorize('admin'), mongoIdParam, updateCategoryValidator, validate, updateCategory);
router.delete('/:id', protect, authorize('admin'), mongoIdParam, validate, deleteCategory);

export default router;
