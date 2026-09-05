import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';

let socket = null;
const socketService = {
  connectSocket: () => {
    if (socket?.connected) return socket;
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      // Prefer one long-lived WebSocket session so Railway does not route
      // follow-up polling requests to a worker that cannot find the sid.
      // Keep polling as a compatibility fallback for proxies without WS.
      transports: ['websocket', 'polling'],
      tryAllTransports: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });
    return socket;
  },
  disconnectSocket: () => { if (socket) { socket.disconnect(); socket = null; } },
  onNotification: (callback) => socket?.on('notification', callback),
  offNotification: () => socket?.off('notification'),
  getSocket: () => socket,
};
export default socketService;
