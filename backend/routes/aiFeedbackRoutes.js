import express from 'express';
import { listAIFeedback, reviewAIFeedback, submitAIFeedback } from '../controllers/aiFeedbackController.js';
import { protect } from '../middlewares/authMiddleware.js';
import authorize from '../middlewares/roleMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import { mongoIdParam } from '../utils/validators.js';

const router = express.Router();
router.post('/', protect, submitAIFeedback);
router.get('/', protect, authorize('admin'), listAIFeedback);
router.put('/:id/review', protect, authorize('admin'), mongoIdParam, validate, reviewAIFeedback);
export default router;
