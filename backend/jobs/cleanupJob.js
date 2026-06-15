import cron from 'node-cron';
import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import ImageAnalysis from '../models/ImageAnalysis.js';
import { deleteMultipleImages } from '../services/cloudinaryService.js';

/**
 * Cleanup function to remove images and detailed descriptions for items
 * that have been resolved (claimed or closed) for more than 7 days.
 */
export const runCleanupTask = async () => {
  try {
    console.log('🧹 Running automated cleanup job for old resolved items...');
    
    // Calculate 7 days ago
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // Filter for items to clean up
    const query = {
      status: { $in: ['claimed', 'closed'] },
      resolvedAt: { $lte: sevenDaysAgo },
      isArchived: false,
    };

    // 1. Process Lost Items
    const oldLostItems = await LostItem.find(query);
    for (const item of oldLostItems) {
      await processItemCleanup(item, LostItem);
    }

    // 2. Process Found Items
    const oldFoundItems = await FoundItem.find(query);
    for (const item of oldFoundItems) {
      await processItemCleanup(item, FoundItem);
    }

    console.log(`✅ Cleanup job finished. Archived ${oldLostItems.length} lost items and ${oldFoundItems.length} found items.`);
  } catch (error) {
    console.error('❌ Error during automated cleanup job:', error);
  }
};

/**
 * Helper to process the cleanup for a single item.
 */
const processItemCleanup = async (item, Model) => {
  try {
    // Delete images from Cloudinary
    if (item.images && item.images.length > 0) {
      const publicIds = item.images
        .filter((img) => img.publicId)
        .map((img) => ({ publicId: img.publicId }));

      if (publicIds.length > 0) {
        await deleteMultipleImages(publicIds);
      }
    }

    // Update item details
    await Model.findByIdAndUpdate(item._id, {
      $set: {
        images: [],
        description: 'Item resolved. Details and images automatically removed for privacy.',
        isArchived: true,
      }
    });

    // Optionally delete related AI analysis documents to save space
    await ImageAnalysis.deleteMany({ itemId: item._id });
  } catch (error) {
    console.error(`Failed to cleanup item ${item._id}:`, error);
  }
};

/**
 * Initialize and start the cron job.
 * Runs every day at midnight (0 0 * * *)
 */
export const initCleanupJob = () => {
  cron.schedule('0 0 * * *', () => {
    runCleanupTask();
  });
  console.log('⏰ Cleanup job initialized. Will run daily at midnight.');
};
