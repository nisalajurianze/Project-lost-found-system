import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';

let socket = null;
const socketService = {
  connectSocket: () => {
    if (socket?.connected) return socket;
    socket = io(SOCKET_URL, {
      withCredentials: true,
      autoConnect: true,
      transports: ['polling', 'websocket'],
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
