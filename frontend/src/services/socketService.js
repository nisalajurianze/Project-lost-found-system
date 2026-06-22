// ============================================
// Socket.IO Service
// Real-time socket connections & event listeners
// ============================================

import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';

let socket = null;

const socketService = {
  /**
   * Connect to Socket.IO server and register rooms.
   */
  connectSocket: (userId, role) => {
    if (socket?.connected) return socket;

    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      auth: {
        token: localStorage.getItem('accessToken')
      }
    });

    socket.on('connect', () => {
      console.log(`🔌 Socket connected: ${socket.id}`);
      
      // Join user specific notification room
      if (userId) {
        socket.emit('join', userId);
      }
      
      // Join admin broadcast room if admin
      if (role === 'admin') {
        socket.emit('joinAdmin');
      }
    });

    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${reason}`);
    });

    socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error.message);
    });

    return socket;
  },

  /**
   * Disconnect from socket server.
   */
  disconnectSocket: () => {
    if (socket) {
      socket.disconnect();
      socket = null;
      console.log('🔌 Socket disconnected manually.');
    }
  },

  /**
   * Listen for real-time notifications.
   */
  onNotification: (callback) => {
    if (!socket) return;
    socket.on('notification', (data) => {
      console.log('🔔 Socket received notification:', data);
      callback(data);
    });
  },

  /**
   * Stop listening for notifications.
   */
  offNotification: () => {
    if (!socket) return;
    socket.off('notification');
  },

  /**
   * Get the active socket instance.
   */
  getSocket: () => socket
};

export default socketService;
