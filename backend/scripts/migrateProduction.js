import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB, { closeDB } from '../config/db.js';
import Category, { normalizeCategoryName } from '../models/Category.js';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import ClaimRequest from '../models/ClaimRequest.js';
import User from '../models/User.js';
import SystemSetting from '../models/SystemSetting.js';
import RefreshSession from '../models/RefreshSession.js';
import Notification from '../models/Notification.js';
import Match from '../models/Match.js';
import ImageAnalysis from '../models/ImageAnalysis.js';
import JobLock from '../models/JobLock.js';
import OutboxEvent from '../models/OutboxEvent.js';

const PUBLIC_KEYS = new Set(['site_name', 'maintenance_mode', 'allow_registration', 'require_email_verification', 'public_contact_email', 'support_hours', 'contact_details']);

const assertReplicaSet = async () => {
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName) throw new Error('Production migration requires a MongoDB replica set because workflow updates are transactional.');
};

const migrateCategories = async (session) => {
  const categories = await Category.find({}).select('+normalizedName').sort({ createdAt: 1, _id: 1 }).session(session);
  const canonical = new Map();
  for (const category of categories) {
    const normalizedName = normalizeCategoryName(category.name);
    const existing = canonical.get(normalizedName);
    if (!existing) {
      category.normalizedName = normalizedName;
      await category.save({ session, validateBeforeSave: true });
      canonical.set(normalizedName, category);
      continue;
    }
    await Promise.all([
      LostItem.updateMany({ category: category.name }, { $set: { category: existing.name } }, { session }),
      FoundItem.updateMany({ category: category.name }, { $set: { category: existing.name } }, { session }),
    ]);
    await category.deleteOne({ session });
  }
};

const rejectDuplicatePendingClaims = async (session) => {
  for (const targetField of ['foundItemId', 'lostItemId']) {
    const duplicates = await ClaimRequest.aggregate([
      { $match: { status: 'pending', [targetField]: { $type: 'objectId' } } },
      { $sort: { createdAt: 1, _id: 1 } },
      { $group: { _id: { claimantId: '$claimantId', targetId: `$${targetField}` }, ids: { $push: '$_id' }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
    ]).session(session);
    for (const duplicate of duplicates) {
      await ClaimRequest.updateMany(
        { _id: { $in: duplicate.ids.slice(1) } },
        { $set: { status: 'rejected', adminRemark: 'Duplicate pending claim closed during security migration.', reviewedAt: new Date() } },
        { session },
      );
    }
  }
};

const run = async () => {
  if (process.env.CONFIRM_PRODUCTION_MIGRATION !== 'YES') throw new Error('Set CONFIRM_PRODUCTION_MIGRATION=YES after taking a verified backup.');
  await connectDB();
  await assertReplicaSet();

  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      await migrateCategories(session);
      await rejectDuplicatePendingClaims(session);
      await Promise.all([
        LostItem.updateMany({ contactVisibility: 'public' }, { $set: { contactVisibility: 'request_only' } }, { session }),
        FoundItem.updateMany({ contactVisibility: 'public' }, { $set: { contactVisibility: 'request_only' } }, { session }),
      ]);
      await User.updateMany({}, {
        $unset: {
          refreshToken: 1,
          verificationToken: 1,
          resetPasswordToken: 1,
          resetPasswordTokenHash: 1,
          resetPasswordExpire: 1,
        },
      }, { session });
      const settings = await SystemSetting.find({}).session(session);
      for (const setting of settings) {
        setting.isPublic = PUBLIC_KEYS.has(setting.key);
        await setting.save({ session, validateBeforeSave: false });
      }
    });
  } finally { await session.endSession(); }

  await Promise.all([
    Category.createIndexes(),
    ClaimRequest.createIndexes(),
    User.createIndexes(),
    SystemSetting.createIndexes(),
    RefreshSession.createIndexes(),
    Notification.createIndexes(),
    Match.createIndexes(),
    LostItem.createIndexes(),
    FoundItem.createIndexes(),
    OutboxEvent.createIndexes(),
    JobLock.createIndexes(),
    ImageAnalysis.createIndexes(),
  ]);
  console.log('[migration] completed. Existing reports were preserved; legacy public contact flags were made workflow-only; duplicate pending claims were closed deterministically.');
  await closeDB();
};

run().catch(async (error) => {
  console.error('[migration] failed:', error.message);
  await closeDB().catch(() => undefined);
  process.exit(1);
});
