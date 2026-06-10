// ============================================
// Smart Lost & Found - Database Seeder
// Seeds default categories, users, items, matches, and logs
// ============================================

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';

// Models
import User from '../models/User.js';
import Category from '../models/Category.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import Match from '../models/Match.js';
import ClaimRequest from '../models/ClaimRequest.js';
import Notification from '../models/Notification.js';
import Feedback from '../models/Feedback.js';
import AdminLog from '../models/AdminLog.js';
import ImageAnalysis from '../models/ImageAnalysis.js';

dotenv.config();

const seedData = async () => {
  try {
    console.log('🔄 Wiping existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Category.deleteMany({}),
      LostItem.deleteMany({}),
      FoundItem.deleteMany({}),
      Match.deleteMany({}),
      ClaimRequest.deleteMany({}),
      Notification.deleteMany({}),
      Feedback.deleteMany({}),
      AdminLog.deleteMany({}),
      ImageAnalysis.deleteMany({})
    ]);
    console.log('✅ Collections wiped.');

    // ── 1. Seed Users ────────────────────────────────────────────────────────
    console.log('👥 Seeding users...');
    const users = await User.create([
      {
        fullName: 'System Administrator',
        email: 'admin@smartlf.com',
        phone: '+94771234567',
        studentId: 'ADMIN-01',
        password: 'AdminPassword123', // Mongoose pre-save hashes it
        role: 'admin',
        isVerified: true
      },
      {
        fullName: 'Dineth Perera',
        email: 'dineth@student.com',
        phone: '+94719876543',
        studentId: 'UWU-2023-CS-0045',
        password: 'StudentPassword123',
        role: 'user',
        isVerified: true
      },
      {
        fullName: 'Sanduni De Silva',
        email: 'sanduni@student.com',
        phone: '+94721239876',
        studentId: 'UWU-2023-CS-0089',
        password: 'StudentPassword123',
        role: 'user',
        isVerified: true
      }
    ]);
    console.log(`✅ Seeded ${users.length} users (1 Admin, 2 Students).`);

    const admin = users[0];
    const user1 = users[1];
    const user2 = users[2];

    // ── 2. Seed Categories ───────────────────────────────────────────────────
    console.log('📦 Seeding categories...');
    const categories = await Category.create([
      { name: 'Electronics & Gadgets', icon: '📱', description: 'Phones, laptops, chargers, headphones' },
      { name: 'Books & Stationery', icon: '📚', description: 'Notebooks, textbooks, pens, calculators' },
      { name: 'Keys & Keychains', icon: '🔑', description: 'Hostel keys, vehicle keys, locks' },
      { name: 'Wallets & Purses', icon: '💼', description: 'Wallets, purses, ID holders, pouches' },
      { name: 'Identity & Cards', icon: '🪪', description: 'Student IDs, national IDs, driving licenses, ATM cards' },
      { name: 'Bags & Backpacks', icon: '🎒', description: 'Backpacks, handbags, laptop bags' },
      { name: 'Clothing & Apparel', icon: '👕', description: 'Jackets, sweaters, caps, umbrellas' },
      { name: 'Watches & Jewelry', icon: '⌚', description: 'Wristwatches, rings, necklaces, bracelets' },
      { name: 'Water Bottles & Flasks', icon: '🍼', description: 'Metal flasks, plastic bottles' },
      { name: 'Glasses & Eyewear', icon: '🕶️', description: 'Reading glasses, sunglasses, cases' },
      { name: 'Sports Gear', icon: '⚽', description: 'Rackets, balls, sports wear' },
      { name: 'Musical Instruments', icon: '🎸', description: 'Guitar picks, tuners, instruments' },
      { name: 'Medical & Health', icon: '💊', description: 'Inhalers, prescription glasses, medicine kits' },
      { name: 'Files & Folders', icon: '📁', description: 'Project files, assignment sheets' },
      { name: 'Others', icon: '📦', description: 'Miscellaneous items not in other categories' }
    ]);
    console.log(`✅ Seeded ${categories.length} categories.`);

    // ── 3. Seed Lost Items ───────────────────────────────────────────────────
    console.log('📋 Seeding lost items...');
    const lostItems = await LostItem.create([
      {
        userId: user1._id,
        itemName: 'Space Grey iPhone 13 Pro',
        category: 'Electronics & Gadgets',
        description: 'Lost my iPhone 13 Pro with a dark blue silicon case. Back screen is slightly cracked near the camera.',
        lostLocation: 'Main Library - 2nd Floor Study Area',
        lostDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        status: 'matched',
        tags: ['iPhone', 'Apple', 'Mobile', 'Phone', 'Grey'],
        contactPreference: 'both'
      },
      {
        userId: user1._id,
        itemName: 'Black UWU Student ID Card',
        category: 'Identity & Cards',
        description: 'Lost student ID card. Name printed is Dineth Perera, ID: UWU-2023-CS-0045.',
        lostLocation: 'Student Canteen Area',
        lostDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
        status: 'pending',
        tags: ['Student ID', 'ID Card', 'UWU', 'Card'],
        contactPreference: 'email'
      },
      {
        userId: user2._id,
        itemName: 'Silver Dell Inspiron 15 Laptop',
        category: 'Electronics & Gadgets',
        description: 'Forgot my laptop in a black sleeve. Model: Dell Inspiron 15 5000 Series. Has a sticker of a developer frog on the back.',
        lostLocation: 'Computer Lab 3 - Main Block',
        lostDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        status: 'matched',
        tags: ['Dell', 'Laptop', 'Computer', 'Silver', 'Sleeve'],
        contactPreference: 'phone'
      },
      {
        userId: user2._id,
        itemName: 'Suzuki Bike Key with Red Keychain',
        category: 'Keys & Keychains',
        description: 'Bike key with a red UWU lanyard keychain. Found near the playground gate.',
        lostLocation: 'Playground gate side walkway',
        lostDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
        status: 'pending',
        tags: ['Key', 'Bike Key', 'Suzuki', 'Red Keychain'],
        contactPreference: 'both'
      }
    ]);
    console.log(`✅ Seeded ${lostItems.length} lost items.`);

    // ── 4. Seed Found Items ──────────────────────────────────────────────────
    console.log('📦 Seeding found items...');
    const foundItems = await FoundItem.create([
      {
        userId: user2._id,
        itemName: 'iPhone 13 with blue case',
        category: 'Electronics & Gadgets',
        description: 'Found a black color iPhone 13 in a navy blue silicon cover on the desk. Screen is cracked near the top right.',
        foundLocation: 'Library - Floor 2 desks',
        foundDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        storedAt: 'Library Front Desk',
        status: 'matched',
        tags: ['iPhone', 'Apple', 'Blue case', 'Mobile'],
        contactPreference: 'both'
      },
      {
        userId: user2._id,
        itemName: 'UWU Student ID Card',
        category: 'Identity & Cards',
        description: 'Student ID card found in the lobby. Name is Dineth Perera.',
        foundLocation: 'Lobby seating area',
        foundDate: new Date(Date.now()),
        storedAt: 'Office of Student Affairs',
        status: 'available',
        tags: ['Student ID', 'ID Card', 'UWU'],
        contactPreference: 'both'
      },
      {
        userId: user1._id,
        itemName: 'Dell Laptop in Black Case',
        category: 'Electronics & Gadgets',
        description: 'Found a Dell laptop (silver body) inside a black zippered case on a lab bench. Screen is closed.',
        foundLocation: 'Computer Lab 3 bench',
        foundDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        storedAt: 'Lab Assistant Office',
        status: 'matched',
        tags: ['Dell', 'Laptop', 'Silver', 'Black Case'],
        contactPreference: 'both'
      },
      {
        userId: user1._id,
        itemName: 'Black Leather Wallet',
        category: 'Wallets & Purses',
        description: 'Found a black leather wallet containing a bus pass and cash. No ID card inside.',
        foundLocation: 'Canteen counter',
        foundDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        storedAt: 'Canteen Manager Office',
        status: 'available',
        tags: ['Wallet', 'Leather', 'Black', 'Canteen'],
        contactPreference: 'both'
      }
    ]);
    console.log(`✅ Seeded ${foundItems.length} found items.`);

    // ── Update Category Item Counts ──────────────────────────────────────────
    await Category.updateOne({ name: 'Electronics & Gadgets' }, { itemCount: 4 });
    await Category.updateOne({ name: 'Identity & Cards' }, { itemCount: 2 });
    await Category.updateOne({ name: 'Keys & Keychains' }, { itemCount: 1 });
    await Category.updateOne({ name: 'Wallets & Purses' }, { itemCount: 1 });

    // ── 5. Seed Image Analysis Heuristics ────────────────────────────────────
    console.log('🤖 Seeding image analyses...');
    await ImageAnalysis.create([
      {
        itemType: 'LostItem',
        itemId: lostItems[0]._id,
        imageUrl: 'http://res.cloudinary.com/demo/image/upload/sample.jpg',
        labels: ['Iphone', 'Smartphone', 'Electronics'],
        colors: ['Grey', 'Black', 'Blue'],
        description: 'An iPhone 13 series smartphone inside a blue rubber protector case.',
        confidence: 95,
        provider: 'fallback'
      },
      {
        itemType: 'FoundItem',
        itemId: foundItems[0]._id,
        imageUrl: 'http://res.cloudinary.com/demo/image/upload/sample.jpg',
        labels: ['Iphone', 'Smartphone', 'Electronics'],
        colors: ['Grey', 'Black', 'Blue'],
        description: 'An iPhone 13 series smartphone inside a blue rubber protector case.',
        confidence: 94,
        provider: 'fallback'
      },
      {
        itemType: 'LostItem',
        itemId: lostItems[2]._id,
        imageUrl: 'http://res.cloudinary.com/demo/image/upload/sample.jpg',
        labels: ['Laptop', 'Computer', 'Dell'],
        colors: ['Silver', 'Black'],
        description: 'A silver Dell notebook inside a protective zippered cover.',
        confidence: 92,
        provider: 'fallback'
      },
      {
        itemType: 'FoundItem',
        itemId: foundItems[2]._id,
        imageUrl: 'http://res.cloudinary.com/demo/image/upload/sample.jpg',
        labels: ['Laptop', 'Computer', 'Dell'],
        colors: ['Silver', 'Black'],
        description: 'A silver Dell notebook inside a protective zippered cover.',
        confidence: 92,
        provider: 'fallback'
      }
    ]);
    console.log('✅ Seeded image analyses.');

    // ── 6. Seed Matches ──────────────────────────────────────────────────────
    console.log('🎯 Seeding matches...');
    const matches = await Match.create([
      {
        lostItemId: lostItems[0]._id,
        foundItemId: foundItems[0]._id,
        lostUserId: user1._id,
        foundUserId: user2._id,
        similarityScore: 92,
        confidencePercentage: 92,
        reason: 'Same item category, 85% text match, Matching colors identified, AI detected matching visual characteristics (100% label match)',
        status: 'suggested'
      },
      {
        lostItemId: lostItems[2]._id,
        foundItemId: foundItems[2]._id,
        lostUserId: user2._id,
        foundUserId: user1._id,
        similarityScore: 95,
        confidencePercentage: 95,
        reason: 'Same item category, 90% text match, Matching colors identified, AI detected matching visual characteristics (100% label match)',
        status: 'suggested'
      }
    ]);
    console.log(`✅ Seeded ${matches.length} matches.`);

    // ── 7. Seed Notifications ────────────────────────────────────────────────
    console.log('🔔 Seeding notifications...');
    await Notification.create([
      {
        userId: user1._id,
        title: '🎯 Potential Match Found!',
        message: 'We found a potential match for your lost Space Grey iPhone 13 Pro!',
        type: 'match_found',
        relatedItem: { itemType: 'Match', itemId: matches[0]._id },
        isRead: false
      },
      {
        userId: user2._id,
        title: '🎯 Potential Match Found!',
        message: 'We found a potential match for your lost Dell Inspiron Laptop!',
        type: 'match_found',
        relatedItem: { itemType: 'Match', itemId: matches[1]._id },
        isRead: false
      },
      {
        userId: user1._id,
        title: 'Welcome to Smart Lost & Found!',
        message: 'Please verify your email address to unlock all features.',
        type: 'welcome',
        isRead: true
      }
    ]);
    console.log('✅ Seeded notifications.');

    // ── 8. Seed Feedback ─────────────────────────────────────────────────────
    console.log('💬 Seeding feedback...');
    await Feedback.create([
      {
        userId: user1._id,
        subject: 'Great Platform!',
        message: 'This has made finding lost assignments and hostel keys so much easier. Excellent work!',
        rating: 5,
        category: 'praise',
        status: 'reviewed',
        adminResponse: 'Thank you for your kind words! We are glad the system is helpful.'
      },
      {
        userId: user2._id,
        subject: 'Notification bug',
        message: 'Sometimes the notifications arrive a few seconds late on my phone. Let me know if that is normal.',
        rating: 4,
        category: 'bug_report',
        status: 'pending'
      }
    ]);
    console.log('✅ Seeded feedback.');

    // ── 9. Seed Admin Logs ───────────────────────────────────────────────────
    console.log('🛡️ Seeding admin audit logs...');
    await AdminLog.create([
      {
        adminId: admin._id,
        action: 'USER_ACTIVATION',
        targetModel: 'User',
        targetId: user1._id,
        details: 'Admin verified Dineth Perera student ID card status.',
        ipAddress: '127.0.0.1'
      },
      {
        adminId: admin._id,
        action: 'SYSTEM_CONFIG',
        targetModel: 'System',
        details: 'Seeded default database tables and initial categories.',
        ipAddress: '127.0.0.1'
      }
    ]);
    console.log('✅ Seeded admin logs.');

    console.log('🎉 DATABASE SEEDING COMPLETED SUCCESSFULLY!');
  } catch (error) {
    console.error('💀 Database seeding failed:', error);
    process.exit(1);
  }
};

// Start execution
connectDB().then(() => {
  seedData().then(() => {
    mongoose.connection.close();
  });
});
