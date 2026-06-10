// ============================================
// Cloudinary Service
// Upload, delete, and transform images
// ============================================

import { cloudinary, configureCloudinary } from '../config/cloudinary.js';

// Track whether Cloudinary is configured
let isConfigured = false;

/**
 * Initialise Cloudinary. Called once at server startup.
 */
const initCloudinary = () => {
  isConfigured = configureCloudinary();
};

/**
 * Upload a single image buffer to Cloudinary.
 *
 * @param {Buffer} fileBuffer - Image file buffer (from multer memoryStorage)
 * @param {string} folder     - Cloudinary folder (e.g. 'lost-items')
 * @param {object} options    - Additional Cloudinary upload options
 * @returns {Promise<{url: string, publicId: string}>}
 */
const uploadImage = async (fileBuffer, folder = 'smart-lf', options = {}) => {
  if (!isConfigured) {
    // Fallback: return a data-URI placeholder so the app still works
    console.warn('⚠️  Cloudinary not configured. Returning placeholder image data.');
    const base64 = fileBuffer.toString('base64');
    const mimeType = options.mimeType || 'image/jpeg';
    return {
      url: `data:${mimeType};base64,${base64.substring(0, 100)}...`, // truncated for storage
      publicId: `local_${Date.now()}`,
    };
  }

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 800, height: 800, crop: 'limit', quality: 'auto:good' },
        ],
        ...options,
      },
      (error, result) => {
        if (error) {
          console.error(`❌ Cloudinary upload error: ${error.message}`);
          return reject(error);
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
        });
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Upload multiple image buffers.
 *
 * @param {Array<{buffer: Buffer, mimetype: string}>} files - Multer file objects
 * @param {string} folder - Cloudinary folder
 * @returns {Promise<Array<{url: string, publicId: string}>>}
 */
const uploadMultipleImages = async (files, folder = 'smart-lf') => {
  if (!files || files.length === 0) return [];

  const uploadPromises = files.map((file) =>
    uploadImage(file.buffer, folder, { mimeType: file.mimetype })
  );

  return Promise.all(uploadPromises);
};

/**
 * Delete a single image from Cloudinary by its public ID.
 *
 * @param {string} publicId
 * @returns {Promise<boolean>}
 */
const deleteImage = async (publicId) => {
  if (!isConfigured || !publicId || publicId.startsWith('local_')) {
    return true; // Nothing to delete
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error(`❌ Cloudinary delete error: ${error.message}`);
    return false;
  }
};

/**
 * Delete multiple images.
 *
 * @param {Array<{publicId: string}>} images
 * @returns {Promise<void>}
 */
const deleteMultipleImages = async (images) => {
  if (!images || images.length === 0) return;

  const deletePromises = images
    .filter((img) => img.publicId)
    .map((img) => deleteImage(img.publicId));

  await Promise.allSettled(deletePromises);
};

export {
  initCloudinary,
  uploadImage,
  uploadMultipleImages,
  deleteImage,
  deleteMultipleImages,
};
