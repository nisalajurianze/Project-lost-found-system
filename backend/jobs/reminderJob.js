// ============================================
// Reminder Job
// Checks for items connected 2+ days ago
// Sends a reminder to verify resolution
// ============================================

import mongoose from 'mongoose';
import cron from 'node-cron';
import FoundItem from '../models/FoundItem.js';
import LostItem from '../models/LostItem.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';

/**
 * Run the reminder job
 */
const runReminderJob = async () => {
  console.log('[Reminder Job] Starting reminder checks for connected items...');
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const emailService = await import('../services/emailService.js');
    const { sendEmail, templates } = emailService.default || emailService;

    // Helper to process items
    const processItems = async (Model, itemType) => {
      const items = await Model.find({
        status: 'in_progress',
        connectedAt: { $lte: twoDaysAgo },
        reminderSent: false
      }).populate('userId connectedUserId');

      let count = 0;

      for (const item of items) {
        if (!item.userId || !item.connectedUserId) continue;

        const owner = item.userId;
        const connectedUser = item.connectedUserId;
        
        // Ensure FRONTEND_URL is available
        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
        
        const verificationLink = `${frontendUrl}/dashboard/verify-resolution/${itemType}/${item._id}`;

        const emailHtml = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4f46e5;">Resolution Verification</h2>
            <p>Hello,</p>
            <p>It's been a few days since you connected regarding the ${itemType} item: <strong>${item.itemName}</strong>.</p>
            <p>Have you successfully exchanged this item?</p>
            <div style="margin: 30px 0;">
              <a href="${verificationLink}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Verify Resolution</a>
            </div>
            <p>If you didn't receive or hand over the item, you can also cancel the connection using the link above so someone else can claim it.</p>
            <p>Best regards,<br/>Smart L&F Team</p>
          </div>
        `;

        // Send Email to Owner
        try {
          await sendEmail(owner.email, 'Did you resolve this item?', emailHtml);
        } catch (e) {
          console.error(`Failed to send reminder email to ${owner.email}`, e);
        }

        // Send Email to Connected User
        try {
          await sendEmail(connectedUser.email, 'Did you resolve this item?', emailHtml);
        } catch (e) {
          console.error(`Failed to send reminder email to ${connectedUser.email}`, e);
        }

        // Create In-App Notification for Owner
        await Notification.create({
          recipient: owner._id,
          title: 'Verify Item Resolution',
          message: `Have you successfully handed over the ${itemType} item: ${item.itemName}? Please confirm.`,
          type: 'system',
          link: `/dashboard/verify-resolution/${itemType}/${item._id}`,
        });

        // Create In-App Notification for Connected User
        await Notification.create({
          recipient: connectedUser._id,
          title: 'Verify Item Resolution',
          message: `Did you successfully receive the ${itemType} item: ${item.itemName}? Please confirm.`,
          type: 'system',
          link: `/dashboard/verify-resolution/${itemType}/${item._id}`,
        });

        // Mark as sent
        item.reminderSent = true;
        await item.save();

        count++;
      }
      return count;
    };

    const foundCount = await processItems(FoundItem, 'found');
    const lostCount = await processItems(LostItem, 'lost');

    console.log(`[Reminder Job] Completed. Sent reminders for ${foundCount} found items and ${lostCount} lost items.`);
  } catch (error) {
    console.error('[Reminder Job] Error running reminder job:', error);
  }
};

export const initReminderJob = () => {
  // Run daily at 10:00 AM
  cron.schedule('0 10 * * *', () => {
    runReminderJob();
  });
  console.log('⏰ Reminder job initialized. Will run daily at 10:00 AM.');
};

export default runReminderJob;
