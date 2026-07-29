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
  deleteFoundItem,
  resolveFoundItem,
  cancelConnectionFoundItem
} from '../controllers/foundItemController.js';
import { protect, optionalAuth } from '../middlewares/authMiddleware.js';
import { uploadMultiple } from '../middlewares/uploadMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import {
  createFoundItemValidator,
  updateFoundItemValidator,
  mongoIdParam,
  foundItemQueryValidator,
  handoverCancellationValidator
} from '../utils/validators.js';


const router = express.Router();

// Publicly viewable found items
router.get('/', optionalAuth, foundItemQueryValidator, validate, getFoundItems);
router.get('/:id', optionalAuth, mongoIdParam, validate, getFoundItemById);

// Protected report/management
router.post('/', protect, uploadMultiple, createFoundItemValidator, validate, createFoundItem);
router.put('/:id', protect, uploadMultiple, mongoIdParam, updateFoundItemValidator, validate, updateFoundItem);
router.delete('/:id', protect, mongoIdParam, validate, deleteFoundItem);
router.post('/:id/resolve', protect, mongoIdParam, validate, resolveFoundItem);
router.post('/:id/cancel-connection', protect, mongoIdParam, handoverCancellationValidator, validate, cancelConnectionFoundItem);

export default router;
