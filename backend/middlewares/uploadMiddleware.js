// ============================================
// Upload Middleware (Multer)
// Memory storage for streaming to Cloudinary
// ============================================

import multer from 'multer';
import ApiError from '../utils/apiError.js';

// ── Storage: keep files in memory (Buffer) for direct Cloudinary upload ─
const storage = multer.memoryStorage();

// ── File filter: allow only images ──────────────────────────────────────
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        `Invalid file type: ${file.mimetype}. Only JPEG, PNG, GIF, and WebP images are allowed.`
      ),
      false
    );
  }
};

// ── Multer instance ─────────────────────────────────────────────────────
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file
    files: 5, // max 5 files per request
  },
});

// ── Pre-built middleware variants ────────────────────────────────────────

/** Upload a single image (field name: "image") */
const uploadSingle = upload.single('image');

/** Upload up to 5 images (field name: "images") */
const uploadMultiple = upload.array('images', 5);

/** Upload up to 3 proof images (field name: "proofImages") */
const uploadProofImages = upload.array('proofImages', 3);

/** Upload a single profile image (field name: "profileImage") */
const uploadProfileImage = upload.single('profileImage');

export { upload, uploadSingle, uploadMultiple, uploadProofImages, uploadProfileImage };
