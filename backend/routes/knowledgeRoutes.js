import express from 'express';
import { answerKnowledge, createKnowledge, listKnowledge, reviewKnowledge } from '../controllers/knowledgeController.js';
import { optionalAuth, protect } from '../middlewares/authMiddleware.js';
import authorize from '../middlewares/roleMiddleware.js';

const router = express.Router();
router.get('/answer', optionalAuth, answerKnowledge);
router.get('/admin', protect, authorize('admin'), listKnowledge);
router.post('/admin', protect, authorize('admin'), createKnowledge);
router.patch('/admin/:id/review', protect, authorize('admin'), reviewKnowledge);
export default router;
