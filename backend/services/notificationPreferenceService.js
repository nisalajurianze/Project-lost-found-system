const DEFAULT_NOTIFICATION_PREFERENCES = Object.freeze({
  pushEnabled: true,
  emailEnabled: true,
  smartMatchesEnabled: true,
  minimumMatchConfidence: 75,
  quietHours: Object.freeze({ enabled: false, start: '22:00', end: '07:00', timezone: 'Asia/Colombo' }),
  categories: Object.freeze({
    matches: true,
    claims: true,
    handover: true,
    reminders: true,
    system: true,
  }),
});

const CATEGORY_KEYS = Object.freeze(Object.keys(DEFAULT_NOTIFICATION_PREFERENCES.categories));

const normalizeNotificationPreferences = (value = {}) => {
  const categories = value?.categories && typeof value.categories === 'object' ? value.categories : {};
  return {
    pushEnabled: value?.pushEnabled !== false,
    emailEnabled: value?.emailEnabled !== false,
    smartMatchesEnabled: value?.smartMatchesEnabled !== false,
    minimumMatchConfidence: Math.min(95, Math.max(50, Number(value?.minimumMatchConfidence) || 75)),
    quietHours: {
      enabled: value?.quietHours?.enabled === true,
      start: /^([01]\d|2[0-3]):[0-5]\d$/u.test(value?.quietHours?.start) ? value.quietHours.start : '22:00',
      end: /^([01]\d|2[0-3]):[0-5]\d$/u.test(value?.quietHours?.end) ? value.quietHours.end : '07:00',
      timezone: 'Asia/Colombo',
    },
    categories: Object.fromEntries(CATEGORY_KEYS.map((key) => [key, categories[key] !== false])),
  };
};

const notificationCategory = (type) => ({
  match_found: 'matches',
  claim_submitted: 'claims',
  claim_approved: 'handover',
  claim_rejected: 'claims',
  contact_shared: 'handover',
  item_update: 'system',
  welcome: 'system',
  system: 'system',
}[type] || 'system');

const isNotificationChannelEnabled = (preferences, channel, category = 'system') => {
  const normalized = normalizeNotificationPreferences(preferences);
  const channelKey = channel === 'email' ? 'emailEnabled' : channel === 'push' ? 'pushEnabled' : null;
  if (!channelKey) return true;
  if (!normalized[channelKey]) return false;
  return normalized.categories[category] !== false;
};

export {
  DEFAULT_NOTIFICATION_PREFERENCES,
  CATEGORY_KEYS,
  normalizeNotificationPreferences,
  notificationCategory,
  isNotificationChannelEnabled,
};
