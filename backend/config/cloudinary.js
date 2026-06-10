// ============================================
// Cloudinary Configuration
// Gracefully degrades when credentials are missing
// ============================================

import { v2 as cloudinary } from 'cloudinary';

/**
 * Initialise Cloudinary SDK.
 * Returns `true` if configured, `false` otherwise.
 */
const configureCloudinary = () => {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

  // Check if all required credentials are present
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    console.warn(
      '⚠️  Cloudinary credentials not configured. Image uploads will use local fallback.'
    );
    return false;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true,
  });

  console.log('✅ Cloudinary configured successfully.');
  return true;
};

export { cloudinary, configureCloudinary };
