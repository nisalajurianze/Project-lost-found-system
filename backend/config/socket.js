import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import cookie from 'cookie';
import { getRedisClient, isRedisConnected } from './redis.js';
import { clientOrigins } from './security.js';
import { verifyAccessSession, verifySessionFamily } from '../middlewares/authMiddleware.js';

let io;
let subClient;
const SOCKET_REVALIDATE_MS = 30_000;

const normalizeOrigin = (value) => String(value || '').trim().replace(/\/$/, '');
export const isAllowedSocketOrigin = (origin) => Boolean(origin) && clientOrigins.includes(normalizeOrigin(origin));

const authenticateSocket = async (socket) => {
  const cookies = cookie.parse(socket.request.headers.cookie || '');
  if (!cookies.accessToken) throw new Error('Authentication required');
  const authenticated = await verifyAccessSession(cookies.accessToken);
  return {
    id: authenticated.user._id.toString(),
    role: authenticated.user.role,
    familyId: authenticated.familyId,
  };
};

const sessionRoom = (familyId) => `session:${familyId}`;

const initSocket = async (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin(origin, callback) {
        if (isAllowedSocketOrigin(origin)) return callback(null, true);
        return callback(new Error('Origin is not allowed'));
      },
      credentials: true,
    },
    allowRequest(req, callback) {
      callback(null, isAllowedSocketOrigin(req.headers.origin));
    },
    transports: ['websocket', 'polling'],
  });
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
      socket.user = await authenticateSocket(socket);
      return next();
    } catch { return next(new Error('Invalid session')); }
  });
  io.on('connection', (socket) => {
    socket.join(`user:${socket.user.id}`);
    socket.join(sessionRoom(socket.user.familyId));
    if (socket.user.role === 'admin') socket.join('admins');

    const revalidate = async () => {
      try {
        const authenticated = await verifySessionFamily(socket.user.id, socket.user.familyId);
        const current = {
          id: authenticated.user._id.toString(),
          role: authenticated.user.role,
          familyId: authenticated.familyId,
        };
        if (
          current.id !== socket.user.id
          || current.role !== socket.user.role
          || current.familyId !== socket.user.familyId
        ) throw new Error('Session identity changed');
        return true;
      } catch {
        socket.disconnect(true);
        return false;
      }
    };

    const timer = setInterval(() => { void revalidate(); }, SOCKET_REVALIDATE_MS);
    timer.unref?.();
    socket.use(async (_packet, next) => {
      if (await revalidate()) return next();
      return next(new Error('Invalid session'));
    });
    socket.on('disconnect', () => clearInterval(timer));
  });
  return io;
};

const getIO = () => io;
const disconnectSessionSockets = async (familyId) => {
  if (io && familyId) io.in(sessionRoom(String(familyId))).disconnectSockets(true);
};
const disconnectUserSockets = async (userId) => {
  if (io && userId) io.in(`user:${String(userId)}`).disconnectSockets(true);
};
const closeSocket = async () => {
  if (subClient) await subClient.quit().catch(() => subClient.disconnect());
  if (io) await new Promise((resolve) => io.close(resolve));
};

export { initSocket, getIO, disconnectSessionSockets, disconnectUserSockets, closeSocket };
