// ============================================
// Socket.IO Configuration
// Real-time notifications & live updates
// ============================================

import { Server } from 'socket.io';

let io = null;

import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import { createAdapter } from '@socket.io/redis-adapter';
import { getRedisClient } from './redis.js';

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

  // ARCH-001: Horizontal Scaling with Redis Adapter
  try {
    const pubClient = getRedisClient();
    if (pubClient) {
      const subClient = pubClient.duplicate();
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Socket.IO Redis Adapter configured for horizontal scaling.');
    }
  } catch (err) {
    console.warn('⚠️ Could not configure Redis adapter for Socket.io:', err.message);
  }

  // Connection handler
  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Parse cookies from socket request
    let userRole = 'user';
    try {
      if (socket.request.headers.cookie) {
        const cookies = cookie.parse(socket.request.headers.cookie);
        if (cookies.accessToken) {
          const decoded = jwt.verify(cookies.accessToken, process.env.JWT_ACCESS_SECRET);
          userRole = decoded.role;
        }
      }
    } catch (e) {
      // Ignore errors, default to 'user'
    }

    // Join user-specific room for targeted notifications
    socket.on('join', (userId) => {
      if (userId) {
        socket.join(`user_${userId}`);
        console.log(`👤 User ${userId} joined room user_${userId}`);
      }
    });

    // Join admin room for admin-specific events
    socket.on('joinAdmin', () => {
      if (userRole === 'admin') {
        socket.join('admin_room');
        console.log(`🛡️  Socket ${socket.id} joined admin_room`);
      } else {
        console.warn(`⚠️  Unauthorised attempt to join admin_room from socket ${socket.id}`);
      }
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
