import 'dotenv/config';
import express from 'express';
import http from 'node:http';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import RedisStore from 'rate-limit-redis';
import connectDB, { assertTransactionSupport, closeDB } from './config/db.js';
import { initRedis, isRedisConnected, closeRedis, getRedisClient } from './config/redis.js';
import { initSocket, closeSocket } from './config/socket.js';
import { clientOrigins, jobsEnabled, requireRedis, requireEmail, requireCloudinary, requireTransactions, validateSecurityEnvironment } from './config/security.js';
import { initCloudinary } from './services/cloudinaryService.js';
import { initEmailService, isEmailConfigured } from './services/emailService.js';
import { initCleanupJob } from './jobs/cleanupJob.js';
import { initReminderJob } from './jobs/reminderJob.js';
import { startOutboxWorker, stopOutboxWorker } from './services/outboxService.js';
import { csrfProtection } from './middlewares/csrfMiddleware.js';
import sanitize from './middlewares/sanitizeMiddleware.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
import ApiError from './utils/apiError.js';
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import lostItemRoutes from './routes/lostItemRoutes.js';
import foundItemRoutes from './routes/foundItemRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import aiRoutes from './routes/aiRoutes.js';
import aiFeedbackRoutes from './routes/aiFeedbackRoutes.js';
import statsRoutes from './routes/statsRoutes.js';
import systemSettingRoutes from './routes/systemSettingRoutes.js';
import claimRoutes from './routes/claimRoutes.js';
import locationKnowledgeRoutes from './routes/locationKnowledgeRoutes.js';
import { refreshApprovedLocations } from './services/locationKnowledgeBootstrapService.js';

const startServer = async () => {
  validateSecurityEnvironment();
  await connectDB();
  await refreshApprovedLocations();
  const replicaSet = requireTransactions ? await assertTransactionSupport() : null;
  await initRedis();
  const cloudinaryReady = initCloudinary();
  const emailReady = initEmailService();
  if (requireRedis && !isRedisConnected()) throw new Error('Redis is required but unavailable.');
  if (requireCloudinary && !cloudinaryReady) throw new Error('Cloudinary is required but unavailable.');
  if (requireEmail && !emailReady) throw new Error('Email delivery is required but unavailable.');

  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  const server = http.createServer(app);

  app.use(helmet({
    hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
    contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"] } },
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));
  app.use(cors({
    origin(origin, callback) {
      if (!origin || clientOrigins.includes(origin.replace(/\/$/, ''))) return callback(null, true);
      return callback(ApiError.forbidden('Origin is not allowed.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token', 'X-Requested-With'],
  }));
  app.use(compression({ level: 6 }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: false, limit: '1mb' }));
  app.use(sanitize);
  app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

  const limiterOptions = { windowMs: 15 * 60 * 1000, limit: 1000, standardHeaders: 'draft-8', legacyHeaders: false };
  if (isRedisConnected()) {
    limiterOptions.store = new RedisStore({ prefix: 'rl-v3:', sendCommand: (...args) => getRedisClient().call(...args) });
  }
  app.use('/api', rateLimit(limiterOptions));
  app.use('/api', csrfProtection);

  app.get('/health', (_req, res) => res.json({ success: true, status: 'UP', timestamp: new Date().toISOString() }));
  app.get('/api/health', (_req, res) => res.json({ success: true, status: 'UP', timestamp: new Date().toISOString() }));
  app.get('/api/health/ready', (_req, res) => {
    const mongoReady = mongoose.connection.readyState === 1;
    const redisReady = isRedisConnected();
    const emailConfigured = isEmailConfigured();
    const ready = mongoReady && (!requireRedis || redisReady) && (!requireCloudinary || cloudinaryReady) && (!requireEmail || emailConfigured);
    res.status(ready ? 200 : 503).json({
      success: ready,
      status: ready ? 'READY' : 'NOT_READY',
      dependencies: {
        mongodb: mongoReady,
        transactions: requireTransactions ? (replicaSet ? `replica-set:${replicaSet}` : 'required-unavailable') : 'optional',
        redis: redisReady ? 'connected' : (requireRedis ? 'required-unavailable' : 'optional-unavailable'),
        cloudinary: cloudinaryReady ? 'configured' : (requireCloudinary ? 'required-unavailable' : 'optional-unavailable'),
        email: emailConfigured ? 'configured' : (requireEmail ? 'required-unavailable' : 'optional-unavailable'),
      },
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/lost-items', lostItemRoutes);
  app.use('/api/found-items', foundItemRoutes);
  app.use('/api/matches', matchRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/feedback', feedbackRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/ai', aiRoutes);
  app.use('/api/ai-feedback', aiFeedbackRoutes);
  app.use('/api/stats', statsRoutes);
  app.use('/api/settings', systemSettingRoutes);
  app.use('/api/claims', claimRoutes);
  app.use('/api/locations', locationKnowledgeRoutes);
  app.get('/', (_req, res) => res.json({ message: 'Smart Lost & Found API', version: '2.0.0' }));
  app.use(notFound);
  app.use(errorHandler);

  await initSocket(server);
  if (jobsEnabled) {
    startOutboxWorker();
    initCleanupJob();
    initReminderJob();
  }

  const port = Number(process.env.PORT || 5000);
  server.listen(port, () => console.log(`Smart L&F API listening on ${port}`));

  let shuttingDown = false;
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log(`Received ${signal}; shutting down.`);
    const forceTimer = setTimeout(() => process.exit(1), 15_000);
    forceTimer.unref();
    await new Promise((resolve) => server.close(resolve));
    stopOutboxWorker();
    await Promise.allSettled([closeSocket(), closeRedis(), closeDB()]);
    clearTimeout(forceTimer);
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('unhandledRejection', (error) => { console.error('Unhandled rejection', error); shutdown('unhandledRejection'); });
  process.on('uncaughtException', (error) => { console.error('Uncaught exception', error); shutdown('uncaughtException'); });
};

startServer().catch((error) => { console.error('Failed to start server:', error); process.exit(1); });
