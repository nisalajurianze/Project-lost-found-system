import { sendEmail } from './emailService.js';
import { isNotificationChannelEnabled } from './notificationPreferenceService.js';

const sendWorkflowEmail = async ({ user, category = 'system', ...message }) => {
  if (!user?.email) return false;
  if (!isNotificationChannelEnabled(user.notificationPreferences, 'email', category)) return false;
  return sendEmail({ to: user.email, ...message });
};

export { sendWorkflowEmail };
