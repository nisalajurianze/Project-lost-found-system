import cron from 'node-cron';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import ImageAnalysis from '../models/ImageAnalysis.js';
import { deleteMultipleImages } from '../services/cloudinaryService.js';
import { withJobLock } from '../services/jobLockService.js';

const retentionDays = () => Math.min(3650, Math.max(7, Number(process.env.RESOLVED_RETENTION_DAYS || 30)));

const cleanupModel = async (Model, statuses, cutoff, limit) => {
  const items = await Model.find({
    status: { $in: statuses },
    resolvedAt: { $lte: cutoff },
    isArchived: { $ne: true },
  }).sort({ resolvedAt: 1 }).limit(limit);
  let archived = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await deleteMultipleImages(item.images || [], { strict: true });
      const updated = await Model.updateOne(
        { _id: item._id, isArchived: { $ne: true } },
        { $set: { images: [], description: 'Resolved item details removed after the configured privacy-retention period.', isArchived: true } },
      );
      if (updated.modifiedCount) {
        await ImageAnalysis.deleteMany({ itemId: item._id });
        archived += 1;
      }
    } catch (error) {
      failed += 1;
      console.error('[cleanup] item retained for retry', { itemId: String(item._id), error: error.message });
    }
  }
  return { archived, failed, scanned: items.length };
};

const runCleanupTask = () => withJobLock('resolved-item-cleanup', 55 * 60 * 1000, async () => {
  const days = retentionDays();
  const cutoff = new Date(Date.now() - days * 86_400_000);
  const batchLimit = Math.min(1000, Math.max(10, Number(process.env.CLEANUP_BATCH_LIMIT || 100)));
  const [lost, found] = await Promise.all([
    cleanupModel(LostItem, ['claimed', 'closed'], cutoff, batchLimit),
    cleanupModel(FoundItem, ['claimed'], cutoff, batchLimit),
  ]);
  console.log('[cleanup] completed', { retentionDays: days, lost, found });
  return { lost, found };
});

const initCleanupJob = () => {
  cron.schedule('15 0 * * *', () => runCleanupTask().catch((error) => console.error('[cleanup] failed', error.message)), {
    timezone: process.env.JOB_TIMEZONE || 'Asia/Colombo',
  });
  console.log('[cleanup] daily job scheduled.');
};

export { runCleanupTask, initCleanupJob };
