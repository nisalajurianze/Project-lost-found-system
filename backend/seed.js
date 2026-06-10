// ============================================
// Database Seed Script
// Creates: Admin, Demo Users, Categories, Lost & Found Items
// Run: node scripts/seed.js
// ============================================

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import dns from 'dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);

dotenv.config();

// ── Inline Models (avoid circular import issues) ─────────────────────────

const userSchema = new mongoose.Schema({
  fullName: String,
  email: { type: String, unique: true, lowercase: true },
  phone: { type: String, default: '' },
  studentId: { type: String, unique: true, uppercase: true },
  password: { type: String, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  isVerified: { type: Boolean, default: true },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date, default: null },
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

const categorySchema = new mongoose.Schema({
  name: { type: String, unique: true, trim: true },
  icon: { type: String, default: '📦' },
  description: { type: String, default: '' },
  isActive: { type: Boolean, default: true },
  itemCount: { type: Number, default: 0 },
}, { timestamps: true });

const lostItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  itemName: String,
  category: String,
  description: String,
  images: { type: Array, default: [] },
  lostLocation: String,
  lostDate: Date,
  status: { type: String, default: 'pending' },
  tags: { type: [String], default: [] },
  contactPreference: { type: String, default: 'email' },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

const foundItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  itemName: String,
  category: String,
  description: String,
  images: { type: Array, default: [] },
  foundLocation: String,
  foundDate: Date,
  status: { type: String, default: 'available' },
  tags: { type: [String], default: [] },
  contactPreference: { type: String, default: 'email' },
  isDeleted: { type: Boolean, default: false },
}, { timestamps: true });

const User     = mongoose.models.User     || mongoose.model('User', userSchema);
const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);
const LostItem = mongoose.models.LostItem || mongoose.model('LostItem', lostItemSchema);
const FoundItem= mongoose.models.FoundItem|| mongoose.model('FoundItem', foundItemSchema);

// ── Seed Data ────────────────────────────────────────────────────────────

const CATEGORIES = [
  { name: 'Electronics',    icon: '📱', description: 'Phones, laptops, tablets, earbuds, chargers' },
  { name: 'Bags & Wallets', icon: '👜', description: 'Backpacks, handbags, purses, wallets' },
  { name: 'Keys',           icon: '🔑', description: 'House keys, car keys, locker keys' },
  { name: 'ID & Cards',     icon: '💳', description: 'Student IDs, NIC, bank cards, library cards' },
  { name: 'Books & Notes',  icon: '📚', description: 'Textbooks, notebooks, files, documents' },
  { name: 'Clothing',       icon: '👕', description: 'Jackets, hoodies, scarves, caps' },
  { name: 'Accessories',    icon: '⌚', description: 'Watches, glasses, jewellery, umbrellas' },
  { name: 'Sports & Gym',   icon: '🏋️', description: 'Water bottles, gym gear, sports equipment' },
  { name: 'Other',          icon: '📦', description: 'Anything that does not fit above categories' },
];

const DEMO_USERS = [
  { fullName: 'Anush Perera',    email: 'anush@seu.ac.lk',    studentId: 'EG/2021/001', phone: '0771234567' },
  { fullName: 'Kasun Silva',     email: 'kasun@seu.ac.lk',    studentId: 'EG/2021/002', phone: '0772345678' },
  { fullName: 'Nimal Fernando',  email: 'nimal@seu.ac.lk',    studentId: 'CS/2022/010', phone: '0773456789' },
  { fullName: 'Dilani Jayasena', email: 'dilani@seu.ac.lk',   studentId: 'CS/2022/011', phone: '0774567890' },
];

const DEMO_PASSWORD = 'Demo@1234';

// ── Main Seeder ──────────────────────────────────────────────────────────

async function seed() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      console.error('❌ MONGO_URI not set in .env');
      process.exit(1);
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log(`✅ Connected: ${mongoose.connection.host}/${mongoose.connection.name}\n`);

    // ── 1. Admin Account ────────────────────────────────────────────────
    console.log('👑 Creating Admin account...');
    const adminExists = await User.findOne({ 
      $or: [
        { email: 'smartlostandfound.seusl@gmail.com' }, 
        { studentId: 'ADMIN001' }
      ] 
    });
    if (adminExists) {
      console.log('   ⚠️  Admin user already exists — ensuring admin role');
      if (adminExists.role !== 'admin' || !adminExists.isVerified) {
        adminExists.role = 'admin';
        adminExists.isVerified = true;
        await adminExists.save();
        console.log('   ✅ Admin user role/verification updated');
      }
    } else {
      const admin = new User({
        fullName:  'Smart L&F Admin',
        email:     'smartlostandfound.seusl@gmail.com',
        studentId: 'ADMIN001',
        password:  'Admin@LF2024',
        phone:     '0700000000',
        role:      'admin',
        isVerified: true,
      });
      await admin.save();
      console.log('   ✅ Admin created');
      console.log('   📧 Email   : smartlostandfound.seusl@gmail.com');
      console.log('   🔒 Password: Admin@LF2024');
    }

    // ── 2. Demo Users ───────────────────────────────────────────────────
    console.log('\n👥 Creating Demo Users...');
    const createdUsers = [];
    for (const u of DEMO_USERS) {
      const exists = await User.findOne({
        $or: [
          { email: u.email },
          { studentId: u.studentId }
        ]
      });
      if (exists) {
        console.log(`   ⚠️  ${u.fullName} (${u.email} / ${u.studentId}) already exists — skipping`);
        createdUsers.push(exists);
      } else {
        const user = new User({ ...u, password: DEMO_PASSWORD, isVerified: true });
        await user.save();
        console.log(`   ✅ Created: ${u.fullName} (${u.email})`);
        createdUsers.push(user);
      }
    }
    console.log(`   🔒 Demo Password: ${DEMO_PASSWORD}`);

    // ── 3. Categories ───────────────────────────────────────────────────
    console.log('\n🏷️  Creating Categories...');
    for (const cat of CATEGORIES) {
      const exists = await Category.findOne({ name: cat.name });
      if (exists) {
        console.log(`   ⚠️  "${cat.name}" already exists — skipping`);
      } else {
        await Category.create(cat);
        console.log(`   ✅ ${cat.icon} ${cat.name}`);
      }
    }

    // ── 4. Lost Items ───────────────────────────────────────────────────
    console.log('\n🔍 Creating Demo Lost Items...');
    const lostCount = await LostItem.countDocuments();
    if (lostCount > 0) {
      console.log(`   ⚠️  ${lostCount} lost items already exist — skipping`);
    } else {
      const [u1, u2, u3, u4] = createdUsers;
      const lostItems = [
        {
          userId: u1._id,
          itemName: 'iPhone 13 Pro',
          category: 'Electronics',
          description: 'Space grey iPhone 13 Pro with a cracked screen protector. Has a black leather case with card holder. Lost near the canteen area.',
          lostLocation: 'University Canteen, Main Building',
          lostDate: new Date('2026-06-05'),
          status: 'pending',
          tags: ['iphone', 'phone', 'apple', 'grey'],
          contactPreference: 'both',
        },
        {
          userId: u2._id,
          itemName: 'Blue Backpack',
          category: 'Bags & Wallets',
          description: 'Navy blue Adidas backpack with a small keychain attached. Contains engineering textbooks and a pencil case.',
          lostLocation: 'Engineering Faculty, 2nd Floor Corridor',
          lostDate: new Date('2026-06-07'),
          status: 'pending',
          tags: ['backpack', 'adidas', 'blue', 'bag'],
          contactPreference: 'email',
        },
        {
          userId: u3._id,
          itemName: 'Student ID Card',
          category: 'ID & Cards',
          description: 'SEUSL Student ID card for CS/2022/010. Has a yellow lanyard attached.',
          lostLocation: 'Computer Science Lab, Block C',
          lostDate: new Date('2026-06-08'),
          status: 'pending',
          tags: ['id', 'card', 'student', 'seusl'],
          contactPreference: 'phone',
        },
        {
          userId: u4._id,
          itemName: 'Silver Casio Watch',
          category: 'Accessories',
          description: 'Silver Casio digital watch with a black rubber strap. Has initials DJ engraved on the back.',
          lostLocation: 'Library Reading Room, Ground Floor',
          lostDate: new Date('2026-06-09'),
          status: 'pending',
          tags: ['watch', 'casio', 'silver', 'digital'],
          contactPreference: 'email',
        },
        {
          userId: u1._id,
          itemName: 'Mechanical Pencil Set',
          category: 'Books & Notes',
          description: 'Pentel Graph 1000 mechanical pencil set in a blue zip pouch. Contains 0.3, 0.5, 0.7mm pencils.',
          lostLocation: 'Lecture Hall 3, Main Building',
          lostDate: new Date('2026-06-09'),
          status: 'pending',
          tags: ['pencil', 'pentel', 'stationery'],
          contactPreference: 'email',
        },
        {
          userId: u2._id,
          itemName: 'Black Umbrella',
          category: 'Accessories',
          description: 'Compact black folding umbrella with a red handle. Brand name Samsonite printed on fabric.',
          lostLocation: 'Main Entrance Gate Area',
          lostDate: new Date('2026-06-06'),
          status: 'pending',
          tags: ['umbrella', 'black', 'samsonite', 'folding'],
          contactPreference: 'both',
        },
      ];
      await LostItem.insertMany(lostItems);
      console.log(`   ✅ Created ${lostItems.length} lost item reports`);
    }

    // ── 5. Found Items ──────────────────────────────────────────────────
    console.log('\n📦 Creating Demo Found Items...');
    const foundCount = await FoundItem.countDocuments();
    if (foundCount > 0) {
      console.log(`   ⚠️  ${foundCount} found items already exist — skipping`);
    } else {
      const [u1, u2, u3, u4] = createdUsers;
      const foundItems = [
        {
          userId: u3._id,
          itemName: 'Samsung Galaxy Buds',
          category: 'Electronics',
          description: 'White Samsung Galaxy Buds in a white charging case. Found on a bench near the library entrance.',
          foundLocation: 'Library Entrance, Ground Floor',
          foundDate: new Date('2026-06-08'),
          status: 'available',
          tags: ['earbuds', 'samsung', 'wireless', 'white'],
          contactPreference: 'email',
        },
        {
          userId: u4._id,
          itemName: 'Green Water Bottle',
          category: 'Sports & Gym',
          description: 'Hydro Flask green 32oz water bottle with stickers on it. Found in the gym changing room.',
          foundLocation: 'University Gym, Changing Room',
          foundDate: new Date('2026-06-07'),
          status: 'available',
          tags: ['bottle', 'hydroflask', 'green', 'gym'],
          contactPreference: 'phone',
        },
        {
          userId: u1._id,
          itemName: 'Brown Leather Wallet',
          category: 'Bags & Wallets',
          description: 'Brown leather bifold wallet with some cash and a few cards inside. Found near the canteen.',
          foundLocation: 'Canteen Seating Area',
          foundDate: new Date('2026-06-09'),
          status: 'available',
          tags: ['wallet', 'leather', 'brown', 'bifold'],
          contactPreference: 'both',
        },
        {
          userId: u2._id,
          itemName: 'Set of Keys',
          category: 'Keys',
          description: 'A bunch of 4 keys on a blue keyring with a small Pikachu keychain. Found in the parking area.',
          foundLocation: 'Student Parking Lot, Block B',
          foundDate: new Date('2026-06-08'),
          status: 'available',
          tags: ['keys', 'keychain', 'pikachu', 'blue'],
          contactPreference: 'email',
        },
        {
          userId: u3._id,
          itemName: 'Engineering Drawing Book',
          category: 'Books & Notes',
          description: 'A4 engineering drawing book with student name written inside front cover — "K. Perera". Found on the bench outside Block D.',
          foundLocation: 'Outside Engineering Block D',
          foundDate: new Date('2026-06-10'),
          status: 'available',
          tags: ['book', 'drawing', 'engineering', 'notes'],
          contactPreference: 'email',
        },
      ];
      await FoundItem.insertMany(foundItems);
      console.log(`   ✅ Created ${foundItems.length} found item listings`);
    }

    // ── Summary ──────────────────────────────────────────────────────────
    console.log('\n═══════════════════════════════════════');
    console.log('🎉  SEED COMPLETE!');
    console.log('═══════════════════════════════════════');
    console.log('👑  ADMIN LOGIN:');
    console.log('    Email   : smartlostandfound.seusl@gmail.com');
    console.log('    Password: Admin@LF2024');
    console.log('');
    console.log('👤  DEMO USER LOGIN (any of these):');
    DEMO_USERS.forEach(u => console.log(`    ${u.email}`));
    console.log(`    Password: ${DEMO_PASSWORD}`);
    console.log('═══════════════════════════════════════\n');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
    process.exit(0);
  }
}

seed();
