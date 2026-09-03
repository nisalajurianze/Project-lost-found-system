import express from 'express';
import { approvePoster, previewPoster } from '../controllers/posterController.js';
import { protect } from '../middlewares/authMiddleware.js';

const router = express.Router();
router.post('/:type/:id/preview', protect, previewPoster);
router.post('/:id/approve', protect, approvePoster);
export default router;
