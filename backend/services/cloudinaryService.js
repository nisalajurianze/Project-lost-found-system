import { cloudinary, configureCloudinary } from '../config/cloudinary.js';
import ApiError from '../utils/apiError.js';
let configured = false;

const initCloudinary = () => { configured = configureCloudinary(); return configured; };

const uploadImage = (fileBuffer, folder = 'smart-lf', options = {}) => {
  if (!fileBuffer) throw ApiError.badRequest('Image buffer is missing.');
  if (!configured) throw new ApiError(503, 'Image storage is not configured.');
  const deliveryType = options.authenticated ? 'authenticated' : 'upload';
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder,
      resource_type: 'image',
      type: deliveryType,
      transformation: options.transformation || [{ width: 1600, height: 1600, crop: 'limit', quality: 85 }],
      context: { source: 'smart-lost-found' },
    }, (error, result) => {
      if (error) return reject(error);
      return resolve({
        url: deliveryType === 'upload' ? result.secure_url : '',
        publicId: result.public_id,
        format: result.format || '',
        deliveryType: result.type || deliveryType,
      });
    });
    stream.end(fileBuffer);
  });
};

const uploadReportImage = async (fileBuffer, folder) => {
  const original = await uploadImage(fileBuffer, `${folder}/originals`, {
    authenticated: true,
    transformation: [{ width: 2000, height: 2000, crop: 'limit', quality: 90, flags: 'strip_profile' }],
  });
  try {
    // This is an incoming transformation: Cloudinary stores the transformed
    // pixels as the public asset. The authenticated original remains separate.
    const publicCopy = await uploadImage(fileBuffer, `${folder}/public-safe`, {
      transformation: [{ width: 900, height: 900, crop: 'limit', effect: 'pixelate:60', quality: 75, flags: 'strip_profile' }],
    });
    return {
      ...publicCopy,
      privacyStatus: 'safe_public',
      originalAsset: {
        publicId: original.publicId,
        format: original.format,
        deliveryType: original.deliveryType || 'authenticated',
      },
    };
  } catch (error) {
    await deleteImage(original).catch(() => undefined);
    throw error;
  }
};

const deleteImage = async (imageOrPublicId) => {
  const image = typeof imageOrPublicId === 'string' ? { publicId: imageOrPublicId } : imageOrPublicId;
  if (!configured || !image?.publicId || image.publicId.startsWith('local_')) return true;
  const result = await cloudinary.uploader.destroy(image.publicId, { resource_type: 'image', type: image.deliveryType || 'upload', invalidate: true });
  return ['ok', 'not found'].includes(result.result);
};

const deleteMultipleImages = async (images = [], { strict = false } = {}) => {
  const candidates = images.flatMap((image) => [image, image?.originalAsset]).filter((image) => image?.publicId);
  const results = await Promise.allSettled(candidates.map(deleteImage));
  const failures = results.filter((result) => result.status === 'rejected' || result.value !== true);
  if (strict && failures.length) throw new Error(`Failed to delete ${failures.length} image asset(s).`);
  return { attempted: candidates.length, failures: failures.length, results };
};

const uploadMultipleImages = async (files = [], folder = 'smart-lf', options = {}) => {
  if (!files.length) return [];
  const uploaded = [];
  try {
    for (const file of files) uploaded.push(await uploadImage(file.buffer, folder, { ...options, mimeType: file.mimetype }));
    return uploaded;
  } catch (error) {
    await deleteMultipleImages(uploaded);
    throw error;
  }
};

const uploadMultipleReportImages = async (files = [], folder = 'smart-lf') => {
  if (!files.length) return [];
  const uploaded = [];
  try {
    for (const file of files) uploaded.push(await uploadReportImage(file.buffer, folder));
    return uploaded;
  } catch (error) {
    await deleteMultipleImages(uploaded);
    throw error;
  }
};

const privateAssetView = (image) => {
  if (!configured || !image?.publicId) return null;
  const url = cloudinary.utils.private_download_url(image.publicId, image.format || 'jpg', {
    resource_type: 'image', type: image.deliveryType || 'authenticated',
    expires_at: Math.floor(Date.now() / 1000) + 300, attachment: false,
  });
  return { url, expiresInSeconds: 300 };
};

export { initCloudinary, uploadImage, uploadMultipleImages, uploadReportImage, uploadMultipleReportImages, deleteImage, deleteMultipleImages, privateAssetView };
