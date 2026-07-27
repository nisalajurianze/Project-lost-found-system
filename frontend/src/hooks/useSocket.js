// ============================================
// Socket Custom Hook
// Manages real-time notifications via WebSockets
// ============================================

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { toast } from 'react-hot-toast';
import socketService from '../services/socketService';
import { addSocketNotification } from '../redux/slices/notificationSlice';
import { useLanguage } from '../i18n/LanguageContext';

const NOTIFICATION_BATCH_DELAY_MS = 500;

export const useSocket = (user) => {
  const dispatch = useDispatch();
  const { t } = useLanguage();

  useEffect(() => {
    if (!user?._id) {
      socketService.disconnectSocket();
      return undefined;
    }

    // Authentication is cookie-based. Browser notification permission is
    // requested only after an explicit user action in the dashboard/settings.
    socketService.connectSocket();

    let notificationBuffer = [];
    let timeoutId = null;

    const flushNotifications = () => {
      notificationBuffer.forEach((notification) => dispatch(addSocketNotification(notification)));
      notificationBuffer = [];
      timeoutId = null;
    };

    socketService.onNotification((notification = {}) => {
      notificationBuffer.push(notification);

      const title = notification.title || t('notifications.realtimeFallbackTitle');
      const message = notification.message || '';

      // Exactly one in-app toast is emitted here. Redux reducers remain pure.
      toast.success(message ? `${title}\n${message}` : title, {
        icon: '🔔',
        duration: 6000,
      });

      // Native alerts are useful only while the document is not visible and
      // only after the user has explicitly granted permission elsewhere.
      if (
        typeof document !== 'undefined'
        && document.hidden
        && 'Notification' in window
        && Notification.permission === 'granted'
      ) {
        try {
          new Notification(title, {
            body: message,
            icon: '/favicon.ico',
            tag: notification._id || notification.id || undefined,
          });
        } catch {
          // In-app notification remains available; native delivery is optional.
        }
      }

      if (!timeoutId) timeoutId = window.setTimeout(flushNotifications, NOTIFICATION_BATCH_DELAY_MS);
    });

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      notificationBuffer = [];
      socketService.offNotification();
      socketService.disconnectSocket();
    };
  }, [user?._id, dispatch, t]);

  return socketService;
};

export default useSocket;
