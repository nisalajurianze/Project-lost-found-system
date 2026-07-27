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
  resolveLostItem,
  cancelConnectionLostItem
} from '../controllers/lostItemController.js';
import { protect, optionalAuth } from '../middlewares/authMiddleware.js';
import { uploadMultiple } from '../middlewares/uploadMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import {
  createLostItemValidator,
  updateLostItemValidator,
  mongoIdParam,
  paginationQuery,
  handoverCancellationValidator
} from '../utils/validators.js';


const router = express.Router();

// Publicly viewable items
router.get('/', optionalAuth, paginationQuery, validate, getLostItems);
router.get('/:id', optionalAuth, mongoIdParam, validate, getLostItemById);

// Protected items reporting/management
router.post('/', protect, uploadMultiple, createLostItemValidator, validate, createLostItem);
router.put('/:id', protect, uploadMultiple, mongoIdParam, updateLostItemValidator, validate, updateLostItem);
router.delete('/:id', protect, mongoIdParam, validate, deleteLostItem);
router.post('/:id/resolve', protect, mongoIdParam, validate, resolveLostItem);
router.post('/:id/cancel-connection', protect, mongoIdParam, handoverCancellationValidator, validate, cancelConnectionLostItem);

export default router;
