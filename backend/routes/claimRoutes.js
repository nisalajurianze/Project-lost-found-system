// ============================================
// Claim Routes
// Item ownership claim requests endpoints
// ============================================

import express from 'express';
import {
  createClaimRequest,
  getClaimQuestions,
  getClaimRequests,
  getClaimRequestById,
  reviewClaimRequest,
  shareClaimContact,
  checkClaimExists
} from '../controllers/claimController.js';
import { protect } from '../middlewares/authMiddleware.js';
import { uploadProofImages } from '../middlewares/uploadMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import {
  createClaimValidator,
  reviewClaimValidator,
  mongoIdParam,
  itemIdParam,
  claimQueryValidator,
  claimQuestionParams
} from '../utils/validators.js';

const router = express.Router();

// Require user authentication for all claims endpoints
router.use(protect);

router.post('/', uploadProofImages, createClaimValidator, validate, createClaimRequest);
router.get('/', claimQueryValidator, validate, getClaimRequests);
router.get('/questions/:itemType/:itemId', claimQuestionParams, validate, getClaimQuestions);
router.get('/check/:itemId', itemIdParam, validate, checkClaimExists);
router.get('/:id', mongoIdParam, validate, getClaimRequestById);

// Claim verification reviews (Admin and Founder)
router.put('/:id/review', mongoIdParam, reviewClaimValidator, validate, reviewClaimRequest);

// Share contact info only inside an approved human-reviewed claim
router.patch('/:id/share-contact', mongoIdParam, validate, shareClaimContact);

export default router;
