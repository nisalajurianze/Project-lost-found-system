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

// Config & database imports
import connectDB from './config/db.js';
import { initRedis } from './config/redis.js';
import { initSocket } from './config/socket.js';
import { initCloudinary } from './services/cloudinaryService.js';
import { initEmailService } from './services/emailService.js';

// Middlewares
import sanitize from './middlewares/sanitizeMiddleware.js';
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';

// Route files
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import lostItemRoutes from './routes/lostItemRoutes.js';
import foundItemRoutes from './routes/foundItemRoutes.js';
import matchRoutes from './routes/matchRoutes.js';
import claimRoutes from './routes/claimRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import feedbackRoutes from './routes/feedbackRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

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

  const app = express();
  const server = http.createServer(app);

  // Initialize WebSockets (Socket.IO)
  initSocket(server);

  // ============================================
  // Global Middlewares
  // ============================================

  // HTTP security headers
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production',
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  }));

  // HTTP Request logger (dev mode only)
  if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
  }

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

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
  app.use('/api/claims', claimRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/feedback', feedbackRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/admin', adminRoutes);

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.status(200).json({
      success: true,
      status: 'UP',
      timestamp: new Date()
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
};

startServer().catch((error) => {
  console.error('💀 Failed to start server:', error);
  process.exit(1);
});
