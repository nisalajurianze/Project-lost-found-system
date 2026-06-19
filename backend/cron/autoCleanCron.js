import cron from 'node-cron';
import FoundItem from '../models/FoundItem.js';
import LostItem from '../models/LostItem.js';
import ClaimRequest from '../models/ClaimRequest.js';
import Notification from '../models/Notification.js';

export const initCronJobs = () => {
  // Run every day at midnight (00:00)
  cron.schedule('0 0 * * *', async () => {
    console.log('--- Running Daily Auto-Clean & Reminder Cron Job ---');
    try {
      const now = Date.now();
      
      // 1. Auto-delete claimed items (older than 3 days since marked 'claimed')
      const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);
      
      const foundClaimedRes = await FoundItem.updateMany(
        { status: 'claimed', updatedAt: { $lte: threeDaysAgo }, isDeleted: { $ne: true } },
        { $set: { isDeleted: true } }
      );
      
      const lostClaimedRes = await LostItem.updateMany(
        { status: 'claimed', updatedAt: { $lte: threeDaysAgo }, isDeleted: { $ne: true } },
        { $set: { isDeleted: true } }
      );
      
      console.log(`Auto-deleted ${foundClaimedRes.modifiedCount} claimed FoundItems and ${lostClaimedRes.modifiedCount} claimed LostItems.`);

      // 2. Auto-delete inactive items (older than 30 days without activity)
      const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
      
      const foundInactiveRes = await FoundItem.updateMany(
        { status: { $nin: ['claimed', 'in_progress'] }, createdAt: { $lte: thirtyDaysAgo }, isDeleted: { $ne: true } },
        { $set: { isDeleted: true } }
      );
      
      const lostInactiveRes = await LostItem.updateMany(
        { status: { $nin: ['claimed', 'in_progress', 'closed'] }, createdAt: { $lte: thirtyDaysAgo }, isDeleted: { $ne: true } },
        { $set: { isDeleted: true } }
      );
      
      console.log(`Auto-deleted ${foundInactiveRes.modifiedCount} inactive FoundItems and ${lostInactiveRes.modifiedCount} inactive LostItems.`);

      // 3. Auto-delete abandoned in_progress items (older than 14 days)
      const fourteenDaysAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
      
      const foundAbandonedRes = await FoundItem.updateMany(
        { status: 'in_progress', updatedAt: { $lte: fourteenDaysAgo }, isDeleted: { $ne: true } },
        { $set: { isDeleted: true } }
      );
      
      const lostAbandonedRes = await LostItem.updateMany(
        { status: 'in_progress', updatedAt: { $lte: fourteenDaysAgo }, isDeleted: { $ne: true } },
        { $set: { isDeleted: true } }
      );
      
      console.log(`Auto-deleted ${foundAbandonedRes.modifiedCount} abandoned in_progress FoundItems and ${lostAbandonedRes.modifiedCount} abandoned in_progress LostItems.`);

      // 4. Daily reminders for in_progress items
      const inProgressFoundItems = await FoundItem.find({ status: 'in_progress', isDeleted: { $ne: true } });
      const inProgressLostItems = await LostItem.find({ status: 'in_progress', isDeleted: { $ne: true } });
      
      let remindersSent = 0;

      const sendReminder = async (ownerId, claimantId, itemId, itemModel) => {
        const notifDataOwner = {
          userId: ownerId,
          title: 'Action Required: Mark Item as Done',
          message: 'Is this item handed over yet? Please mark it as Claimed/Done to close the request.',
          type: 'system',
          relatedItem: { itemType: itemModel, itemId }
        };
        const notifDataClaimant = {
          userId: claimantId,
          title: 'Action Required: Item Handover',
          message: 'Have you received this item? Please ask the owner to mark it as Claimed/Done.',
          type: 'system',
          relatedItem: { itemType: itemModel, itemId }
        };

        await Notification.create([notifDataOwner, notifDataClaimant]);
        remindersSent += 2;
      };

      // Process FoundItems
      for (const item of inProgressFoundItems) {
        const approvedClaim = await ClaimRequest.findOne({ foundItemId: item._id, status: 'approved' });
        if (approvedClaim) {
          await sendReminder(item.userId, approvedClaim.claimantId, item._id, 'FoundItem');
        }
      }

      // Process LostItems
      for (const item of inProgressLostItems) {
        const approvedClaim = await ClaimRequest.findOne({ lostItemId: item._id, status: 'approved' });
        if (approvedClaim) {
          await sendReminder(item.userId, approvedClaim.claimantId, item._id, 'LostItem');
        }
      }

      console.log(`Sent ${remindersSent} daily reminder notifications for in_progress items.`);

    } catch (err) {
      console.error('Error running daily cron job:', err);
    }
  });
};
