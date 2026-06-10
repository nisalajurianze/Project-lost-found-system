// ============================================
// Socket.IO Configuration
// Real-time notifications & live updates
// ============================================

import { Server } from 'socket.io';

let io = null;

/**
 * Initialise Socket.IO on the HTTP server.
 * @param {import('http').Server} httpServer - Node HTTP server instance
 * @returns {import('socket.io').Server} Socket.IO server
 */
const initSocket = (httpServer) => {
  const allowedOrigin = process.env.CLIENT_URL
    ? [process.env.CLIENT_URL, process.env.CLIENT_URL.replace(/\/$/, '')]
    : ['http://localhost:5173', 'http://localhost:3000'];

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Join user-specific room for targeted notifications
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`👤 User ${userId} joined room user_${userId}`);
      }
    });

    // Join admin room for admin-specific events
    socket.on('joinAdmin', () => {
      socket.join('admin_room');
      console.log(`🛡️  Socket ${socket.id} joined admin_room`);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Socket disconnected: ${socket.id} (${reason})`);
    });

    // Error handler
    socket.on('error', (error) => {
      console.error(`❌ Socket error [${socket.id}]: ${error.message}`);
    });
  });

  console.log('✅ Socket.IO initialised successfully.');
  return io;
};

/**
 * Get the current Socket.IO instance.
 * @returns {import('socket.io').Server|null}
 */
const getIO = () => {
  if (!io) {
    console.warn('⚠️  Socket.IO not initialised yet.');
  }
  return io;
};

export { initSocket, getIO };
