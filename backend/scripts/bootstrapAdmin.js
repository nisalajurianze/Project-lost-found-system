import 'dotenv/config';
import connectDB, { closeDB } from '../config/db.js';
import User from '../models/User.js';

const strongPassword = (value) => typeof value === 'string'
  && value.length >= 14
  && /[a-z]/.test(value)
  && /[A-Z]/.test(value)
  && /\d/.test(value)
  && /[^A-Za-z0-9]/.test(value);

const run = async () => {
  if (process.env.CONFIRM_BOOTSTRAP_ADMIN !== 'YES') throw new Error('Set CONFIRM_BOOTSTRAP_ADMIN=YES for this explicit one-time operation.');
  const email = String(process.env.ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const fullName = String(process.env.ADMIN_NAME || 'System Administrator').trim();
  const studentId = String(process.env.ADMIN_STUDENT_ID || '').trim().toUpperCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new Error('ADMIN_EMAIL must be valid.');
  if (!strongPassword(password)) throw new Error('ADMIN_PASSWORD must be at least 14 characters and include upper, lower, number, and symbol.');

  await connectDB();
  const existingActiveAdmins = await User.countDocuments({ role: 'admin', isActive: true, deletedAt: null });
  if (existingActiveAdmins > 0 && process.env.ALLOW_ADDITIONAL_ADMIN !== 'YES') {
    throw new Error('An active administrator already exists. Set ALLOW_ADDITIONAL_ADMIN=YES only after an authorized review.');
  }
  const existing = await User.findOne({ $or: [{ email }, ...(studentId ? [{ studentId }] : [])] });
  if (existing) throw new Error('A user with ADMIN_EMAIL or ADMIN_STUDENT_ID already exists; the bootstrap script will not silently promote it.');

  await User.create({
    fullName,
    email,
    password,
    studentId: studentId || undefined,
    role: 'admin',
    isVerified: true,
    isActive: true,
    authProvider: 'local',
  });
  console.log('[bootstrap-admin] administrator created successfully. Credentials were not printed.');
  await closeDB();
};

run().catch(async (error) => {
  console.error('[bootstrap-admin] failed:', error.message);
  await closeDB().catch(() => undefined);
  process.exit(1);
});
