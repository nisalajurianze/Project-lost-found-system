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

    // Subscribe to notification channel
    socketService.onNotification((notification) => {
      dispatch(addSocketNotification(notification));
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
