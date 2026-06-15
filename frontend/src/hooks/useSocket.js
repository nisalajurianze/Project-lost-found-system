// ============================================
// Socket Custom Hook
// Manages real-time notifications via WebSockets
// ============================================

import { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import socketService from '../services/socketService';
import { addSocketNotification } from '../redux/slices/notificationSlice';

export const useSocket = (user) => {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!user || !user._id) {
      socketService.disconnectSocket();
      return;
    }

    // Connect to Socket.IO server
    console.log(`🔌 Initializing socket client for user: ${user.fullName}`);
    socketService.connectSocket(user._id, user.role);

    // Request browser notification permission
    if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }

    // Subscribe to notification channel with batching/debouncing (PERF-010)
    let notificationBuffer = [];
    let timeoutId = null;

    socketService.onNotification((notification) => {
      notificationBuffer.push(notification);
      
      // Trigger native browser push notification if permitted and document is hidden
      // or just show it anyway for important alerts
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification(notification.title || 'Smart L&F Update', {
            body: notification.message,
            icon: '/favicon.ico' // Or any suitable logo path
          });
        } catch (err) {
          console.warn('Native notification failed:', err);
        }
      }

      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          notificationBuffer.forEach(n => dispatch(addSocketNotification(n)));
          notificationBuffer = [];
          timeoutId = null;
        }, 500); // Process buffer every 500ms
      }
    });

    // Cleanup on unmount or user change
    return () => {
      socketService.offNotification();
      socketService.disconnectSocket();
    };
  }, [user, dispatch]);

  return socketService;
};

export default useSocket;
