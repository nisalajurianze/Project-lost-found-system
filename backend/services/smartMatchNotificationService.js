import FoundItem from '../models/FoundItem.js';
import LostItem from '../models/LostItem.js';
import Match from '../models/Match.js';
import OutboxEvent from '../models/OutboxEvent.js';
import User from '../models/User.js';
import { createNotification } from './notificationService.js';
import { normalizeNotificationPreferences } from './notificationPreferenceService.js';
import { sendWorkflowEmail } from './workflowEmailService.js';

const toMinutes = (value) => {
  const [hours, minutes] = String(value || '').split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : 0;
};

const colomboMinutes = (now) => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now).filter((entry) => entry.type !== 'literal').map((entry) => [entry.type, entry.value]));
  return Number(parts.hour) * 60 + Number(parts.minute);
};

const quietHoursDecision = (quietHours, now = new Date()) => {
  if (!quietHours?.enabled) return { quiet: false, deliverAt: now };
  const current = colomboMinutes(now);
  const start = toMinutes(quietHours.start);
  const end = toMinutes(quietHours.end);
  const quiet = start === end ? true : start < end ? current >= start && current < end : current >= start || current < end;
  if (!quiet) return { quiet: false, deliverAt: now };
  const delayMinutes = current < end ? end - current : (24 * 60 - current) + end;
  return { quiet: true, deliverAt: new Date(now.getTime() + Math.max(1, delayMinutes) * 60_000) };
};

const evaluateSmartMatchAlert = ({ match, preferences, now = new Date() }) => {
  const normalized = normalizeNotificationPreferences(preferences);
  const reasons = [];
  if (!normalized.smartMatchesEnabled || !normalized.categories.matches) reasons.push('match-alerts-disabled');
  if (Number(match?.similarityScore) < normalized.minimumMatchConfidence) reasons.push('below-user-threshold');
  if (Number(match?.confidencePercentage) < Math.max(50, normalized.minimumMatchConfidence - 10)) reasons.push('low-calibrated-confidence');
  if (Number(match?.evidenceQuality) < 35) reasons.push('insufficient-evidence');
  if (!['strong', 'very-strong'].includes(match?.confidenceBand)) reasons.push('confidence-band-not-strong');
  const quiet = quietHoursDecision(normalized.quietHours, now);
  return {
    eligible: reasons.length === 0,
    reasons,
    scheduledFor: quiet.deliverAt,
    deferredForQuietHours: quiet.quiet,
    threshold: normalized.minimumMatchConfidence,
    policy: 'calibrated-evidence-user-preference-human-verification',
  };
};

const queueStrongMatchNotifications = async ({ match, lost, found, now = new Date() }) => {
  const users = await User.find({ _id: { $in: [lost.userId, found.userId] } }).select('isActive notificationPreferences').lean();
  const userMap = new Map(users.map((entry) => [String(entry._id), entry]));
  const recipients = [
    { user: userMap.get(String(lost.userId)), side: 'lost' },
    { user: userMap.get(String(found.userId)), side: 'found' },
  ];
  const decisions = [];
  for (const { user, side } of recipients) {
    if (!user?.isActive) continue;
    const decision = evaluateSmartMatchAlert({ match, preferences: user.notificationPreferences, now });
    decisions.push({ userId: user._id, side, ...decision });
    if (!decision.eligible) continue;
    const dedupeKey = `match.notify:${match._id}:${user._id}`;
    await OutboxEvent.updateOne(
      { dedupeKey },
      {
        $setOnInsert: {
          type: 'match.notify',
          payload: { matchId: match._id, userId: user._id, participantSide: side },
          dedupeKey,
          status: 'pending',
          availableAt: decision.scheduledFor,
        },
      },
      { upsert: true },
    );
  }
  return decisions;
};

const deliverQueuedMatchNotification = async ({ matchId, userId, participantSide }) => {
  const [match, user] = await Promise.all([
    Match.findById(matchId).lean(),
    User.findById(userId).select('fullName email isActive notificationPreferences').lean(),
  ]);
  if (!match || match.status === 'rejected' || !user?.isActive) return null;
  const Model = participantSide === 'lost' ? LostItem : FoundItem;
  const itemId = participantSide === 'lost' ? match.lostItemId : match.foundItemId;
  const item = await Model.findById(itemId).select('itemName').lean();
  if (!item) return null;
  const baseUrl = String(process.env.CLIENT_URLS || process.env.CLIENT_URL || 'http://localhost:5173').split(',')[0].replace(/\/$/u, '');
  const dedupeKey = `strong-match:${match._id}:${user._id}`;
  const message = `A potential match for “${item.itemName}” scored ${match.similarityScore}% with ${match.confidencePercentage}% calibrated confidence. Review the evidence; this is not proof of ownership.`;
  const [notification] = await Promise.all([
    createNotification({
      userId: user._id,
      title: 'High-confidence potential match',
      message,
      type: 'match_found',
      relatedItem: { itemType: 'Match', itemId: match._id },
      dedupeKey,
    }),
    sendWorkflowEmail({
      user,
      category: 'matches',
      template: 'matchFound',
      data: { itemName: item.itemName, score: match.similarityScore, url: `${baseUrl}/dashboard/matches`, eventId: dedupeKey },
      idempotencyKey: dedupeKey,
    }),
  ]);
  return notification;
};

export {
  deliverQueuedMatchNotification,
  evaluateSmartMatchAlert,
  queueStrongMatchNotifications,
  quietHoursDecision,
};
