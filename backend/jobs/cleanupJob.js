import cron from 'node-cron';
import mongoose from 'mongoose';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import ClaimRequest from '../models/ClaimRequest.js';
import Match from '../models/Match.js';
import ImageAnalysis from '../models/ImageAnalysis.js';
import SystemSetting from '../models/SystemSetting.js';
import { deleteMultipleImages } from '../services/cloudinaryService.js';
import { withJobLock } from '../services/jobLockService.js';
import { createNotification } from '../services/notificationService.js';

const getRetentionSettings = async () => {
  const settings = await SystemSetting.find({
    key: { $in: ['retention_resolved_days', 'retention_inactive_days', 'retention_unconfirmed_claims_days'] },
  }).lean();

  const map = new Map(settings.map((s) => [s.key, Number(s.value)]));
  return {
    resolvedDays: Number.isFinite(map.get('retention_resolved_days')) ? Math.max(1, map.get('retention_resolved_days')) : 3,
    inactiveDays: Number.isFinite(map.get('retention_inactive_days')) ? Math.max(1, map.get('retention_inactive_days')) : 30,
    unconfirmedClaimsDays: Number.isFinite(map.get('retention_unconfirmed_claims_days')) ? Math.max(1, map.get('retention_unconfirmed_claims_days')) : 14,
  };
};

// 1. Fully Resolved Items: Delete images, purge AI analysis, mark archived
const cleanupResolvedModel = async (Model, statuses, cutoff, limit) => {
  const items = await Model.find({
    status: { $in: statuses },
    isArchived: { $ne: true },
    $or: [
      { resolvedAt: { $lte: cutoff } },
      { resolvedAt: null, updatedAt: { $lte: cutoff } },
    ],
  }).sort({ resolvedAt: 1, updatedAt: 1 }).limit(limit);

  let archived = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await deleteMultipleImages(item.images || [], { strict: false });
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const updated = await Model.updateOne(
            { _id: item._id, isArchived: { $ne: true } },
            { $set: { images: [], description: 'Resolved item details removed after the configured privacy-retention period.', isArchived: true } },
            { session },
          );
          if (updated.modifiedCount) {
            await ImageAnalysis.deleteMany({ itemId: item._id }, { session });
            archived += 1;
          }
        });
      } finally { await session.endSession(); }
    } catch (error) {
      failed += 1;
      console.error('[cleanup] resolved item retention retry', { itemId: String(item._id), error: error.message });
    }
  }
  return { archived, failed, scanned: items.length };
};

// 2. Inactive / Unresolved Reports: Auto-archive after 30 days & notify reporter
const cleanupInactiveModel = async (Model, activeStatus, cutoff, inactiveDays, isLost, limit) => {
  const items = await Model.find({
    status: activeStatus,
    isArchived: { $ne: true },
    createdAt: { $lte: cutoff },
  }).sort({ createdAt: 1 }).limit(limit);

  let archived = 0;
  let failed = 0;
  for (const item of items) {
    try {
      await deleteMultipleImages(item.images || [], { strict: false });
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          const updated = await Model.updateOne(
            { _id: item._id, isArchived: { $ne: true } },
            { $set: { images: [], isArchived: true, status: 'closed' } },
            { session },
          );
          if (updated.modifiedCount) {
            await ImageAnalysis.deleteMany({ itemId: item._id }, { session });
            archived += 1;
          }
        });
      } finally { await session.endSession(); }

      if (item.userId) {
        await createNotification({
          userId: item.userId,
          title: 'Report expired and archived',
          message: `Your report for "${item.itemName}" was automatically closed and archived after ${inactiveDays} days of inactivity to save storage resources.`,
          type: 'system',
          relatedItem: {
            itemType: isLost ? 'LostItem' : 'FoundItem',
            itemId: item._id,
          },
          dedupeKey: `expired-report-${item._id}`,
        }).catch(() => {});
      }
    } catch (error) {
      failed += 1;
      console.error('[cleanup] inactive item retention retry', { itemId: String(item._id), error: error.message });
    }
  }
  return { archived, failed, scanned: items.length };
};

// 3. Stale Approved / Unconfirmed Claims: Cancel connection after 14 days
const cleanupStaleApprovedClaims = async (cutoff, unconfirmedDays, limit) => {
  const staleClaims = await ClaimRequest.find({
    status: 'approved',
    updatedAt: { $lte: cutoff },
  }).limit(limit);

  let cancelled = 0;
  for (const claim of staleClaims) {
    try {
      const session = await mongoose.startSession();
      try {
        await session.withTransaction(async () => {
          await ClaimRequest.updateOne(
            { _id: claim._id, status: 'approved' },
            { $set: { status: 'rejected', adminRemark: `Auto-cancelled after ${unconfirmedDays} days of inactivity without confirmed handover.` } },
            { session },
          );

          if (claim.foundItemId) {
            await FoundItem.updateOne(
              { _id: claim.foundItemId, status: 'in_progress' },
              { $set: { status: 'available', connectedUserId: null, connectedAt: null } },
              { session },
            );
          }
          if (claim.lostItemId) {
            await LostItem.updateOne(
              { _id: claim.lostItemId, status: 'in_progress' },
              { $set: { status: 'pending', connectedUserId: null, connectedAt: null } },
              { session },
            );
          }
          if (claim.matchId) {
            await Match.updateOne(
              { _id: claim.matchId, status: 'confirmed' },
              { $set: { status: 'suggested' } },
              { session },
            );
          }
          cancelled += 1;
        });
      } finally { await session.endSession(); }

      if (claim.claimantId) {
        await createNotification({
          userId: claim.claimantId,
          title: 'Claim expired due to inactivity',
          message: `Your approved claim was automatically cancelled after ${unconfirmedDays} days without handover confirmation.`,
          type: 'claim',
          relatedItem: { itemType: 'ClaimRequest', itemId: claim._id },
          dedupeKey: `stale-claim-${claim._id}`,
        }).catch(() => {});
      }
    } catch (error) {
      console.error('[cleanup] stale claim cancellation retry', { claimId: String(claim._id), error: error.message });
    }
  }
  return { cancelled, scanned: staleClaims.length };
};

const runCleanupTask = () => withJobLock('resolved-item-cleanup', 55 * 60 * 1000, async () => {
  const { resolvedDays, inactiveDays, unconfirmedClaimsDays } = await getRetentionSettings();
  const batchLimit = Math.min(1000, Math.max(10, Number(process.env.CLEANUP_BATCH_LIMIT || 100)));

  const resolvedCutoff = new Date(Date.now() - resolvedDays * 86_400_000);
  const inactiveCutoff = new Date(Date.now() - inactiveDays * 86_400_000);
  const unconfirmedCutoff = new Date(Date.now() - unconfirmedClaimsDays * 86_400_000);

  const [resolvedLost, resolvedFound, inactiveLost, inactiveFound, staleClaims] = await Promise.all([
    cleanupResolvedModel(LostItem, ['claimed', 'closed'], resolvedCutoff, batchLimit),
    cleanupResolvedModel(FoundItem, ['claimed'], resolvedCutoff, batchLimit),
    cleanupInactiveModel(LostItem, 'pending', inactiveCutoff, inactiveDays, true, batchLimit),
    cleanupInactiveModel(FoundItem, 'available', inactiveCutoff, inactiveDays, false, batchLimit),
    cleanupStaleApprovedClaims(unconfirmedCutoff, unconfirmedClaimsDays, batchLimit),
  ]);

  const summary = {
    settings: { resolvedDays, inactiveDays, unconfirmedClaimsDays },
    resolvedCleaned: { lost: resolvedLost, found: resolvedFound },
    inactiveArchived: { lost: inactiveLost, found: inactiveFound },
    staleClaimsCancelled: staleClaims,
  };

  console.log('[cleanup] completed lifecycle retention run', summary);
  return summary;
});

const initCleanupJob = () => {
  cron.schedule('15 0 * * *', () => runCleanupTask().catch((error) => console.error('[cleanup] failed', error.message)), {
    timezone: process.env.JOB_TIMEZONE || 'Asia/Colombo',
  });
  console.log('[cleanup] daily lifecycle retention job scheduled.');
};

export { runCleanupTask, initCleanupJob };
