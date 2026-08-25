// ============================================
// Category Routes
// Categories endpoints with admin protection
// ============================================

import express from 'express';
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

// Publicly viewable categories list
router.get('/', getCategories);

// Global taxonomy is privileged state. Suggestions may be mapped/created only
// by an administrator until a separate approval queue exists.
router.post('/auto-create', protect, authorize('admin'), autoCreateCategory);

// Admin-only management endpoints
router.post('/', protect, authorize('admin'), createCategoryValidator, validate, createCategory);
router.put('/:id', protect, authorize('admin'), mongoIdParam, updateCategoryValidator, validate, updateCategory);
router.delete('/:id', protect, authorize('admin'), mongoIdParam, validate, deleteCategory);

export default router;
