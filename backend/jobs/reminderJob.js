import cron from 'node-cron';
import FoundItem from '../models/FoundItem.js';
import LostItem from '../models/LostItem.js';
import { sendWorkflowEmail } from '../services/workflowEmailService.js';
import { createNotification } from '../services/notificationService.js';
import { withJobLock } from '../services/jobLockService.js';

const clientUrl = () => (process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')[0].trim().replace(/\/$/, '');

const processItems = async (Model, modelName, routeType, cutoff) => {
  const items = await Model.find({
    status: 'in_progress',
    connectedAt: { $lte: cutoff },
    reminderSent: false,
  }).populate('userId connectedUserId', 'fullName email isActive notificationPreferences');

  let sent = 0;
  for (const item of items) {
    const participants = [item.userId, item.connectedUserId].filter((user) => user?.isActive && user.email);
    if (participants.length === 0) continue;

    const url = `${clientUrl()}/dashboard/verify-resolution/${routeType}/${item._id}`;
    const results = await Promise.allSettled(participants.map(async (participant) => {
      const dedupeKey = `resolution-reminder:${modelName}:${item._id}:${participant._id}`;
      await createNotification({
        userId: participant._id,
        title: 'Verify item resolution',
        message: `Please confirm whether “${item.itemName}” was handed over successfully.`,
        type: 'system',
        relatedItem: { itemType: modelName, itemId: item._id },
        dedupeKey,
      });
      await sendWorkflowEmail({
        user: participant,
        category: 'reminders',
        template: 'resolutionReminder',
        data: { name: participant.fullName, itemName: item.itemName, url, eventId: dedupeKey },
        idempotencyKey: dedupeKey,
      });
    }));

    const attempted = results.some((result) => result.status === 'fulfilled');
    if (attempted) {
      item.reminderSent = true;
      await item.save();
      sent += 1;
    }
  }
  return sent;
};

const executeReminderJob = async () => {
  const cutoff = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  try {
    const [foundCount, lostCount] = await Promise.all([
      processItems(FoundItem, 'FoundItem', 'found', cutoff),
      processItems(LostItem, 'LostItem', 'lost', cutoff),
    ]);
    console.log('[reminder] completed', { foundCount, lostCount });
    return { foundCount, lostCount };
  } catch (error) {
    console.error('[reminder] failed', { error: error.message });
    throw error;
  }
};

const runReminderJob = () => withJobLock('resolution-reminder', 55 * 60 * 1000, executeReminderJob);

const initReminderJob = () => {
  cron.schedule('0 10 * * *', () => {
    runReminderJob().catch(() => undefined);
  }, { timezone: process.env.JOB_TIMEZONE || 'Asia/Colombo' });
  console.log('[reminder] daily job scheduled.');
};

export { initReminderJob, runReminderJob };
export default runReminderJob;
