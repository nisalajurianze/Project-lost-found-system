// ============================================
// Claim Routes
// Item ownership claim requests endpoints
// ============================================

import express from 'express';
import {
  createClaimRequest,
  getClaimRequests,
  getClaimRequestById,
  reviewClaimRequest
} from '../controllers/claimController.js';
import { protect } from '../middlewares/authMiddleware.js';
import authorize from '../middlewares/roleMiddleware.js';
import { uploadProofImages } from '../middlewares/uploadMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import {
  createClaimValidator,
  reviewClaimValidator,
  mongoIdParam
} from '../utils/validators.js';

const router = express.Router();

// Require user authentication for all claims endpoints
router.use(protect);

router.post('/', uploadProofImages, createClaimValidator, validate, createClaimRequest);
router.get('/', getClaimRequests);
router.get('/:id', mongoIdParam, validate, getClaimRequestById);

// Claim verification reviews (Admin and Founder)
router.put('/:id/review', mongoIdParam, reviewClaimValidator, validate, reviewClaimRequest);

export default router;
