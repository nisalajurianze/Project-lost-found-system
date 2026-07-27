import 'dotenv/config';
import connectDB, { closeDB } from '../config/db.js';
import Category, { normalizeCategoryName } from '../models/Category.js';
import SystemSetting from '../models/SystemSetting.js';

const categories = [
  ['Electronics', '📱', 'Phones, laptops, tablets, earbuds, and chargers'],
  ['Bags & Wallets', '👜', 'Backpacks, handbags, purses, and wallets'],
  ['Keys', '🔑', 'House, vehicle, locker, and other keys'],
  ['ID & Cards', '💳', 'Student IDs, identity cards, bank cards, and library cards'],
  ['Books & Notes', '📚', 'Textbooks, notebooks, files, and documents'],
  ['Clothing', '👕', 'Jackets, hoodies, scarves, caps, and other clothing'],
  ['Accessories', '⌚', 'Watches, glasses, jewellery, and umbrellas'],
  ['Sports & Gym', '🏋️', 'Water bottles, sports equipment, and gym gear'],
  ['Other', '📦', 'Physical items that do not fit another category'],
];

const settings = [
  ['site_name', 'Smart Lost & Found', 'Public site name', true],
  ['maintenance_mode', false, 'Temporarily restrict normal access', true],
  ['allow_registration', true, 'Allow new account registration', true],
  ['require_email_verification', true, 'Require verified email before sign-in', true],
];

const run = async () => {
  await connectDB();
  for (const [name, icon, description] of categories) {
    const normalizedName = normalizeCategoryName(name);
    await Category.updateOne(
      { normalizedName },
      { $setOnInsert: { name, normalizedName, icon, description, isActive: true, itemCount: 0 } },
      { upsert: true, runValidators: true },
    );
  }
  for (const [key, value, description, isPublic] of settings) {
    await SystemSetting.updateOne(
      { key },
      { $setOnInsert: { key, value, description, isPublic } },
      { upsert: true, runValidators: true },
    );
  }
  console.log('[seed] default categories and settings are present; existing data was not changed.');
  await closeDB();
};

run().catch(async (error) => {
  console.error('[seed] failed:', error.message);
  await closeDB().catch(() => undefined);
  process.exit(1);
});
