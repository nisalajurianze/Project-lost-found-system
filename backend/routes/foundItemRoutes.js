// ============================================
// Found Item Routes
// Routing endpoints for found item listings
// ============================================

import express from 'express';
import {
  createFoundItem,
  getFoundItems,
  getFoundItemById,
  updateFoundItem,
  deleteFoundItem
} from '../controllers/foundItemController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadMultiple } from '../middlewares/uploadMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import {
  createFoundItemValidator,
  updateFoundItemValidator,
  mongoIdParam,
  paginationQuery
} from '../utils/validators.js';

const router = express.Router();

// Publicly viewable found items
router.get('/', paginationQuery, getFoundItems);
router.get('/:id', mongoIdParam, validate, getFoundItemById);

// Protected report/management
router.post('/', protect, uploadMultiple, createFoundItemValidator, validate, createFoundItem);
router.put('/:id', protect, uploadMultiple, mongoIdParam, updateFoundItemValidator, validate, updateFoundItem);
router.delete('/:id', protect, mongoIdParam, validate, deleteFoundItem);

export default router;
