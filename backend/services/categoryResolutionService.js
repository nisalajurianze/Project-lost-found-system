import Category, { normalizeCategoryName } from '../models/Category.js';
import { deleteCache } from '../config/redis.js';
import { fallbackCategoryIcon } from '../utils/categoryPresentation.js';
import { canonicalCategoryName, findEquivalentCategory } from '../utils/categoryIdentity.js';

const findActiveCategory = async (value) => findEquivalentCategory(value, await Category.find({ isActive: true }));

const cleanCategoryName = (value) => String(value || '')
  .normalize('NFKC')
  .trim()
  .replace(/\s+/g, ' ')
  .slice(0, 100);

const resolveOrCreateUserCategory = async (value) => {
  const name = cleanCategoryName(canonicalCategoryName(value));
  if (!name) return null;
  const normalizedName = normalizeCategoryName(name);
  const existing = await findActiveCategory(value);
  if (existing) return existing;
  try {
    const category = await Category.create({
      name,
      normalizedName,
      icon: fallbackCategoryIcon(name),
      description: 'User-created physical item category.',
      isActive: true,
    });
    await deleteCache('categories:all');
    return category;
  } catch (error) {
    if (error?.code === 11000) return Category.findOne({ normalizedName, isActive: true });
    throw error;
  }
};

export { cleanCategoryName, findActiveCategory, resolveOrCreateUserCategory };
