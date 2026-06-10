// ============================================
// Match Routes
// AI-generated suggestions retrieval & updates
// ============================================

import express from 'express';
import {
  getMatches,
  getMatchById,
  updateMatchStatus
} from '../controllers/matchController.js';
import { protect } from '../middlewares/authMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import {
  updateMatchValidator,
  mongoIdParam
} from '../utils/validators.js';

const router = express.Router();

// All match endpoints require authentication
router.use(protect);

router.get('/', getMatches);
router.get('/:id', mongoIdParam, validate, getMatchById);
router.put('/:id', mongoIdParam, updateMatchValidator, validate, updateMatchStatus);

export default router;
