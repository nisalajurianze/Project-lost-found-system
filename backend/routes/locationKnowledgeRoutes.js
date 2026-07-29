import express from 'express';
import { listLocationKnowledge, resolveKnownLocation, reviewLocationKnowledge, submitLocationSuggestion } from '../controllers/locationKnowledgeController.js';
import { protect } from '../middlewares/authMiddleware.js';
import authorize from '../middlewares/roleMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import {
  locationListQueryValidator,
  locationResolveQueryValidator,
  locationReviewValidator,
  locationSuggestionValidator,
} from '../utils/validators.js';

const router = express.Router();
router.get('/resolve', locationResolveQueryValidator, validate, resolveKnownLocation);
router.post('/suggestions', protect, locationSuggestionValidator, validate, submitLocationSuggestion);
router.get('/admin', protect, authorize('admin'), locationListQueryValidator, validate, listLocationKnowledge);
router.patch('/admin/:id', protect, authorize('admin'), locationReviewValidator, validate, reviewLocationKnowledge);
export default router;
