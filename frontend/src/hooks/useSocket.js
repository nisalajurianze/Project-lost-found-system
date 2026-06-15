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

    // Subscribe to notification channel with batching/debouncing (PERF-010)
    let notificationBuffer = [];
    let timeoutId = null;

    socketService.onNotification((notification) => {
      notificationBuffer.push(notification);
      
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
