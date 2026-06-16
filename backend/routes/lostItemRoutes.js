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
  deleteLostItem,
  connectLostItem,
  resolveLostItem,
  cancelConnectionLostItem
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

import { cacheResponse } from '../middlewares/cacheMiddleware.js';

const router = express.Router();

// Publicly viewable items
router.get('/', paginationQuery, validate, cacheResponse(60), getLostItems);
router.get('/:id', mongoIdParam, validate, cacheResponse(60), getLostItemById);

// Protected items reporting/management
router.post('/', protect, uploadMultiple, createLostItemValidator, validate, createLostItem);
router.put('/:id', protect, uploadMultiple, mongoIdParam, updateLostItemValidator, validate, updateLostItem);
router.delete('/:id', protect, mongoIdParam, validate, deleteLostItem);
router.post('/:id/connect', protect, mongoIdParam, validate, connectLostItem);
router.post('/:id/resolve', protect, mongoIdParam, validate, resolveLostItem);
router.post('/:id/cancel-connection', protect, mongoIdParam, validate, cancelConnectionLostItem);

export default router;
