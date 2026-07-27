import express from 'express';
import { listLocationKnowledge, resolveKnownLocation, reviewLocationKnowledge, submitLocationSuggestion } from '../controllers/locationKnowledgeController.js';
import { protect } from '../middlewares/authMiddleware.js';
import authorize from '../middlewares/roleMiddleware.js';

const router = express.Router();
router.get('/resolve', resolveKnownLocation);
router.post('/suggestions', protect, submitLocationSuggestion);
router.get('/admin', protect, authorize('admin'), listLocationKnowledge);
router.patch('/admin/:id', protect, authorize('admin'), reviewLocationKnowledge);
export default router;
