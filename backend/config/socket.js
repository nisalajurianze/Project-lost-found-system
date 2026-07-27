import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import cookie from 'cookie';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getRedisClient, isRedisConnected } from './redis.js';
import { clientOrigins, accessSecret } from './security.js';

let io;
let subClient;

const initSocket = async (httpServer) => {
  io = new Server(httpServer, { cors: { origin: clientOrigins, credentials: true }, transports: ['websocket', 'polling'] });
  if (isRedisConnected()) {
    const pubClient = getRedisClient();
    subClient = pubClient?.duplicate();
    if (subClient) {
      await subClient.connect();
      io.adapter(createAdapter(pubClient, subClient));
    }
  }
  io.use(async (socket, next) => {
    try {
      const cookies = cookie.parse(socket.request.headers.cookie || '');
      if (!cookies.accessToken) return next(new Error('Authentication required'));
      const payload = jwt.verify(cookies.accessToken, accessSecret, { algorithms: ['HS256'], issuer: 'smart-lf' });
      const user = await User.findById(payload.sub).select('_id role isActive deletedAt');
      if (!user || !user.isActive || user.deletedAt) return next(new Error('Account unavailable'));
      socket.user = { id: user._id.toString(), role: user.role };
      return next();
    } catch { return next(new Error('Invalid session')); }
  });
  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);
    if (socket.user.role === 'admin') socket.join('admins');
  });
  return io;
};

const getIO = () => io;
const closeSocket = async () => {
  if (subClient) await subClient.quit().catch(() => subClient.disconnect());
  if (io) await new Promise((resolve) => io.close(resolve));
};

export { initSocket, getIO, closeSocket };
