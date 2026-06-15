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
  
  // Trust proxy for rate limiting behind Railway's load balancer
  app.set('trust proxy', 1);

  const server = http.createServer(app);

  // Initialize WebSockets (Socket.IO)
  initSocket(server);

  // ============================================
  // Global Middlewares
  // ============================================

  // HTTP security headers
  app.use(helmet({
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
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  }));

  // CORS configuration
  const allowedOrigin = process.env.CLIENT_URL
    ? [process.env.CLIENT_URL, process.env.CLIENT_URL.replace(/\/$/, '')]
    : ['http://localhost:5173', 'http://localhost:3000'];

  app.use(cors({
    origin: allowedOrigin,
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
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/feedback', feedbackRoutes);
  app.use('/api/categories', categoryRoutes);
  app.use('/api/admin', adminRoutes);

  // ============================================
  // ONE-TIME SEED ENDPOINT (remove after use)
  // GET /api/seed?secret=SEUSL_SEED_2024
  // ============================================
  app.get('/api/seed', async (req, res) => {
    if (req.query.secret !== 'SEUSL_SEED_2024') {
      return res.status(403).json({ message: 'Forbidden' });
    }
    try {
      const bcrypt = await import('bcryptjs');
      const { default: User }      = await import('./models/User.js');
      const { default: Category }  = await import('./models/Category.js');
      const { default: LostItem }  = await import('./models/LostItem.js');
      const { default: FoundItem } = await import('./models/FoundItem.js');

      const results = { created: [], skipped: [] };

      // ── Admin ──────────────────────────────────────────────────
      const adminEmail = 'smartlostandfound.seusl@gmail.com';
      let admin = await User.findOne({ email: adminEmail });
      if (!admin) {
        const hashed = await bcrypt.default.hash('Admin@LF2024', 12);
        admin = await User.create({
          fullName: 'Smart LF Admin', email: adminEmail,
          studentId: 'ADMIN001', phone: '0700000000',
          password: hashed, role: 'admin', isVerified: true
        });
        results.created.push('Admin: ' + adminEmail);
      } else {
        // Make sure existing user is admin
        await User.updateOne({ email: adminEmail }, { role: 'admin', isVerified: true });
        results.skipped.push('Admin already exists — role enforced');
      }

      // ── Demo Users ─────────────────────────────────────────────
      const demoUsers = [
        { fullName: 'Anush Perera',    email: 'anush@seu.ac.lk',    studentId: 'EG2021001' },
        { fullName: 'Kasun Silva',     email: 'kasun@seu.ac.lk',    studentId: 'EG2021002' },
        { fullName: 'Nimal Fernando',  email: 'nimal@seu.ac.lk',    studentId: 'CS2022010' },
        { fullName: 'Dilani Jayasena', email: 'dilani@seu.ac.lk',   studentId: 'CS2022011' },
      ];
      const demoHash = await bcrypt.default.hash('Demo@1234', 12);
      const createdUsers = [];
      for (const u of demoUsers) {
        let user = await User.findOne({ email: u.email });
        if (!user) {
          user = await User.create({ ...u, phone: '0771234567', password: demoHash, isVerified: true });
          results.created.push('User: ' + u.email);
        } else {
          results.skipped.push('User: ' + u.email);
        }
        createdUsers.push(user);
      }

      // ── Categories ─────────────────────────────────────────────
      const cats = [
        { name: 'Electronics',    icon: '📱', description: 'Phones, laptops, tablets, earbuds' },
        { name: 'Bags & Wallets', icon: '👜', description: 'Backpacks, handbags, wallets' },
        { name: 'Keys',           icon: '🔑', description: 'House keys, car keys, locker keys' },
        { name: 'ID & Cards',     icon: '💳', description: 'Student IDs, NIC, bank cards' },
        { name: 'Books & Notes',  icon: '📚', description: 'Textbooks, notebooks, documents' },
        { name: 'Clothing',       icon: '👕', description: 'Jackets, hoodies, scarves, caps' },
        { name: 'Accessories',    icon: '⌚', description: 'Watches, glasses, umbrellas' },
        { name: 'Sports & Gym',   icon: '🏋️', description: 'Water bottles, gym gear' },
        { name: 'Other',          icon: '📦', description: 'Anything else' },
      ];
      for (const cat of cats) {
        const exists = await Category.findOne({ name: cat.name });
        if (!exists) { await Category.create({ ...cat, isActive: true, itemCount: 0 }); results.created.push('Category: ' + cat.name); }
        else results.skipped.push('Category: ' + cat.name);
      }

      // ── Lost Items ─────────────────────────────────────────────
      const lostCount = await LostItem.countDocuments();
      if (lostCount === 0 && createdUsers.length >= 2) {
        const [u1, u2, u3, u4] = createdUsers;
        await LostItem.insertMany([
          { userId: u1._id, itemName: 'iPhone 13 Pro', category: 'Electronics', description: 'Space grey iPhone 13 Pro with cracked screen protector and black leather case with card holder.', lostLocation: 'University Canteen, Main Building', lostDate: new Date('2026-06-05'), tags: ['iphone','phone','apple','grey'], status: 'pending' },
          { userId: u2._id, itemName: 'Blue Backpack', category: 'Bags & Wallets', description: 'Navy blue Adidas backpack with a small keychain attached. Contains engineering textbooks and a pencil case.', lostLocation: 'Engineering Faculty, 2nd Floor', lostDate: new Date('2026-06-07'), tags: ['backpack','adidas','blue'], status: 'pending' },
          { userId: u3._id, itemName: 'Student ID Card', category: 'ID & Cards', description: 'SEUSL Student ID card for CS/2022/010 with yellow lanyard.', lostLocation: 'Computer Science Lab, Block C', lostDate: new Date('2026-06-08'), tags: ['id','card','student'], status: 'pending' },
          { userId: u4._id, itemName: 'Silver Casio Watch', category: 'Accessories', description: 'Silver Casio digital watch with black rubber strap. Initials DJ engraved on the back.', lostLocation: 'Library Reading Room', lostDate: new Date('2026-06-09'), tags: ['watch','casio','silver'], status: 'pending' },
          { userId: u1._id, itemName: 'Mechanical Pencil Set', category: 'Books & Notes', description: 'Pentel Graph 1000 pencil set in blue zip pouch with 0.3, 0.5, 0.7mm pencils.', lostLocation: 'Lecture Hall 3, Main Building', lostDate: new Date('2026-06-09'), tags: ['pencil','pentel','stationery'], status: 'pending' },
          { userId: u2._id, itemName: 'Black Umbrella', category: 'Accessories', description: 'Compact black Samsonite folding umbrella with red handle.', lostLocation: 'Main Entrance Gate Area', lostDate: new Date('2026-06-06'), tags: ['umbrella','black','samsonite'], status: 'pending' },
        ]);
        results.created.push('6 Lost Items');
      } else {
        results.skipped.push('Lost items (' + lostCount + ' already exist)');
      }

      // ── Found Items ────────────────────────────────────────────
      const foundCount = await FoundItem.countDocuments();
      if (foundCount === 0 && createdUsers.length >= 2) {
        const [u1, u2, u3, u4] = createdUsers;
        await FoundItem.insertMany([
          { userId: u3._id, itemName: 'Samsung Galaxy Buds', category: 'Electronics', description: 'White Samsung Galaxy Buds in white charging case found on bench near library entrance.', foundLocation: 'Library Entrance, Ground Floor', foundDate: new Date('2026-06-08'), tags: ['earbuds','samsung','white'], status: 'available' },
          { userId: u4._id, itemName: 'Green Water Bottle', category: 'Sports & Gym', description: 'Hydro Flask green 32oz water bottle with stickers on it found in gym changing room.', foundLocation: 'University Gym, Changing Room', foundDate: new Date('2026-06-07'), tags: ['bottle','hydroflask','green'], status: 'available' },
          { userId: u1._id, itemName: 'Brown Leather Wallet', category: 'Bags & Wallets', description: 'Brown leather bifold wallet with some cash and cards inside found near the canteen.', foundLocation: 'Canteen Seating Area', foundDate: new Date('2026-06-09'), tags: ['wallet','leather','brown'], status: 'available' },
          { userId: u2._id, itemName: 'Set of Keys', category: 'Keys', description: 'Bunch of 4 keys on blue keyring with Pikachu keychain found in parking area.', foundLocation: 'Student Parking Lot, Block B', foundDate: new Date('2026-06-08'), tags: ['keys','keychain','pikachu'], status: 'available' },
          { userId: u3._id, itemName: 'Engineering Drawing Book', category: 'Books & Notes', description: 'A4 engineering drawing book with "K. Perera" written inside front cover.', foundLocation: 'Outside Engineering Block D', foundDate: new Date('2026-06-10'), tags: ['book','drawing','engineering'], status: 'available' },
        ]);
        results.created.push('5 Found Items');
      } else {
        results.skipped.push('Found items (' + foundCount + ' already exist)');
      }

      // Invalidate Redis cache
      try {
        const { deleteCache } = await import('./config/redis.js');
        await deleteCache('categories:all');
        results.created.push('Redis Cache Cleared: categories:all');
      } catch (cacheErr) {
        results.skipped.push('Redis Cache Invalidation failed/skipped: ' + cacheErr.message);
      }

      return res.json({
        success: true,
        message: '🎉 Database seeded successfully!',
        created: results.created,
        skipped: results.skipped,
        logins: {
          admin: { email: 'smartlostandfound.seusl@gmail.com', password: 'Admin@LF2024' },
          demoUser: { email: 'anush@seu.ac.lk', password: 'Demo@1234' }
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

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
};

startServer().catch((error) => {
  console.error('💀 Failed to start server:', error);
  process.exit(1);
});
