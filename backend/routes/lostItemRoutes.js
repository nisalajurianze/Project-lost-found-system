// ============================================
// Lost Item Routes
// Routing endpoints for lost item reports
// ============================================

import express from 'express';
import {
  createLostItem,
  getLostItems,
  getLostItemById,
  updateLostItem,
  deleteLostItem
} from '../controllers/lostItemController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadMultiple } from '../middlewares/uploadMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import {
  createLostItemValidator,
  updateLostItemValidator,
  mongoIdParam,
  paginationQuery
} from '../utils/validators.js';

const router = express.Router();

// Publicly viewable items
router.get('/', paginationQuery, validate, getLostItems);
router.get('/:id', mongoIdParam, validate, getLostItemById);

// Protected items reporting/management
router.post('/', protect, uploadMultiple, createLostItemValidator, validate, createLostItem);
router.put('/:id', protect, uploadMultiple, mongoIdParam, updateLostItemValidator, validate, updateLostItem);
router.delete('/:id', protect, mongoIdParam, validate, deleteLostItem);

export default router;
