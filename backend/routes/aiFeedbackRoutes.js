import express from 'express';
import {
  createAIChallenger,
  getAICalibrationOverview,
  listAIFeedback,
  promoteAIChallenger,
  reviewAIFeedback,
  sealAIDatasetSnapshot,
  submitAIFeedback,
} from '../controllers/aiFeedbackController.js';
import { protect } from '../middlewares/authMiddleware.js';
import authorize from '../middlewares/roleMiddleware.js';
import validate from '../middlewares/validateMiddleware.js';
import { mongoIdParam } from '../utils/validators.js';

const router = express.Router();
router.post('/', protect, submitAIFeedback);
router.get('/', protect, authorize('admin'), listAIFeedback);
router.get('/calibration', protect, authorize('admin'), getAICalibrationOverview);
router.post('/calibration/snapshots', protect, authorize('admin'), sealAIDatasetSnapshot);
router.post('/calibration/experiments', protect, authorize('admin'), createAIChallenger);
router.put('/calibration/experiments/:id/promote', protect, authorize('admin'), promoteAIChallenger);
router.put('/:id/review', protect, authorize('admin'), mongoIdParam, validate, reviewAIFeedback);
export default router;
