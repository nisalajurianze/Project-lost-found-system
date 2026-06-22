// ============================================
// Smart Lost & Found - Main Server Entry Point
// Connects DBs, sets up Socket.IO, loads middlewares & routes
// ============================================

import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import RedisStore from 'rate-limit-redis';

// Config & database imports
import connectDB from './config/db.js';
import { initRedis } from './config/redis.js';
import { initSocket } from './config/socket.js';
import { initCloudinary } from './services/cloudinaryService.js';
import { initEmailService } from './services/emailService.js';
import { initCleanupJob } from './jobs/cleanupJob.js';
import { initReminderJob } from './jobs/reminderJob.js';
import { initCronJobs } from './cron/autoCleanCron.js';

// Middlewares
import sanitize from './middlewares/sanitizeMiddleware.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';

// Route files
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
import statsRoutes from './routes/statsRoutes.js';
import systemSettingRoutes from './routes/systemSettingRoutes.js';
import claimRoutes from './routes/claimRoutes.js';

// Load environment variables
dotenv.config();

// Initialize databases & configuration
const startServer = async () => {
  // Connect MongoDB
  await connectDB();

  // Connect Redis (gracefully falls back if unavailable)
  await initRedis();

  // Initialize Cloudinary SDK
  initCloudinary();

  // Initialize Email/SMTP Service
  initEmailService();

  // Initialize automated cleanup job
  initCleanupJob();

  // Initialize reminder job
  initReminderJob();

  // Initialize auto-delete and daily push reminder cron jobs
  initCronJobs();

  const app = express();
  
  // Trust proxy for rate limiting behind Railway's load balancer
  app.set('trust proxy', 1);

  const server = http.createServer(app);

  // Initialize WebSockets (Socket.IO)
  initSocket(server);

  // ============================================
  // Global Middlewares
  // ============================================

  // HTTP security headers (including HSTS max-age)
  app.use(helmet({
    hsts: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true,
      preload: true
    },
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https:"],
        imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://images.unsplash.com", "https://*.unsplash.com"],
        fontSrc: ["'self'", "https:", "data:"],
        connectSrc: ["'self'", "https:", "wss:", "ws:", "https://project-lost-found-system-production.up.railway.app"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      }
    } : false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' }
  }));

  // CORS configuration
  const allowedOrigin = process.env.CLIENT_URL
    ? [process.env.CLIENT_URL, process.env.CLIENT_URL.replace(/\/$/, '')]
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.use(cors({
    origin: allowedOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
  }));

  // Global rate limiter (SEC-005) with Redis distributed caching
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Increased limit: allow 1000 requests per 15 mins to prevent false positives
    message: 'Too many requests from this IP, please try again after 15 minutes.',
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
      prefix: 'rl-v2:', // Change prefix to invalidate any currently blocked IPs
      // We pass the ioredis instance from initRedis
      // Note: we fetch it lazily or use the global connection pool if available
      sendCommand: async (...args) => {
        const client = (await import('./config/redis.js')).getRedisClient();
        if (client) return client.call(...args);
        throw new Error('Redis not available');
      },
    }),
  });
  app.use('/api', limiter);

  // CSRF Protection Middleware (SEC-003)
  app.use('/api', (req, res, next) => {
    // Only apply to state-changing methods
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      // 1. Check custom header
      const requestedWith = req.headers['x-requested-with'];
      if (!requestedWith || requestedWith !== 'XMLHttpRequest') {
        return res.status(403).json({ message: 'Potential CSRF attempt blocked. Missing X-Requested-With header.' });
      }

      // 2. Strict Origin/Referer Validation
      const origin = req.headers.origin;
      const referer = req.headers.referer;

      // Helper to check if origin is allowed
      const isAllowedOrigin = (url) => {
        if (allowedOrigin.includes(url)) return true;
        // Allow any vercel.app preview domains for Vercel deployments
        if (url.endsWith('.vercel.app') || url.startsWith('http://localhost:')) return true;
        return false;
      };

      // If Origin is provided, it must match
      if (origin && !isAllowedOrigin(origin)) {
        return res.status(403).json({ message: `CSRF blocked: Invalid Origin header (${origin}).` });
      }

      // If no Origin but Referer exists, check Referer
      if (!origin && referer) {
        try {
          const refererUrl = new URL(referer);
          if (!isAllowedOrigin(refererUrl.origin)) {
            return res.status(403).json({ message: 'CSRF blocked: Invalid Referer header.' });
          }
        } catch (err) {
          return res.status(403).json({ message: 'CSRF blocked: Malformed Referer header.' });
        }
      }
    }
    next();
  });

  // HTTP Request logger
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  } else {
    // In production, log standard combined format for auditing
    app.use(morgan('combined'));
  }

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Compression middleware (Level 6 for balanced CPU/compression ratio)
  app.use(compression({ level: 6 }));

  // Cookie parser (needed for JWT in HTTP-only cookies)
  app.use(cookieParser());

  // Prevent NoSQL query injection
  app.use(sanitize);

  // ============================================
  // API Routes Mapping
  // ============================================
  
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
  app.use('/api/stats', statsRoutes);
  app.use('/api/settings', systemSettingRoutes);
  app.use('/api/claims', claimRoutes);



  // Health check endpoint (for Dockerfile and external checkers)
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      status: 'UP',
      timestamp: new Date()
    });
  });

  app.get('/api/health', (req, res) => {
    res.status(200).json({
      success: true,
      status: 'UP',
      timestamp: new Date()
    });
  });

  // Root endpoint
  app.get('/', (req, res) => {
    res.status(200).json({
      message: 'Smart Lost & Found API Server is running.',
      version: '1.0.0',
      status: 'healthy'
    });
  });

  // ============================================
  // Centralized Error Handling
  // ============================================
  
  app.use(notFound);
  app.use(errorHandler);

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`🚀 Smart L&F Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });

  // ARCH-002: Graceful Shutdown
  const gracefulShutdown = async () => {
    console.log('🔄 Received shutdown signal, closing server gracefully...');
    server.close(() => {
      console.log('✅ HTTP server closed.');
      process.exit(0);
    });
    
    // Force close after 10s
    setTimeout(() => {
      console.error('💀 Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', gracefulShutdown);
  process.on('SIGINT', gracefulShutdown);

  // BUG-004: Handle unhandled promise rejections properly
  process.on('unhandledRejection', (reason, promise) => {
    console.error('💀 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown();
  });

  process.on('uncaughtException', (error) => {
    console.error('💀 Uncaught Exception:', error);
    gracefulShutdown();
  });
};

startServer().catch((error) => {
  console.error('💀 Failed to start server:', error);
  process.exit(1);
});
