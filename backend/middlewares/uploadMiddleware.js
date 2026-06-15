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

// ── Magic Byte Validation Middleware (SEC-007) ─────────────────────────
const validateMagicBytes = (req, res, next) => {
  const files = [];
  if (req.file) files.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else {
      for (const key in req.files) {
        files.push(...req.files[key]);
      }
    }
  }

  if (files.length === 0) return next();

  for (const file of files) {
    const buffer = file.buffer;
    if (!buffer || buffer.length < 12) {
      return next(new ApiError(400, 'Invalid or empty file uploaded.'));
    }

    let isValid = false;
    const mime = file.mimetype;

    if (mime === 'image/jpeg' || mime === 'image/jpg') {
      isValid = buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF;
    } else if (mime === 'image/png') {
      isValid = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47;
    } else if (mime === 'image/gif') {
      isValid = buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38;
    } else if (mime === 'image/webp') {
      // WEBP format: RIFF....WEBP
      isValid = buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
                buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
    }

    if (!isValid) {
      return next(new ApiError(400, `File content does not match extension/mimetype for ${file.originalname}. Potential malicious file.`));
    }
  }
  next();
};

// ── Pre-built middleware variants ────────────────────────────────────────

const withValidation = (multerMiddleware) => [multerMiddleware, validateMagicBytes];

/** Upload a single image (field name: "image") */
const uploadSingle = withValidation(upload.single('image'));

/** Upload up to 5 images (field name: "images") */
const uploadMultiple = withValidation(upload.array('images', 5));

/** Upload up to 3 proof images (field name: "proofImages") */
const uploadProofImages = withValidation(upload.array('proofImages', 3));

/** Upload a single profile image (field name: "profileImage") */
const uploadProfileImage = withValidation(upload.single('profileImage'));

export { upload, uploadSingle, uploadMultiple, uploadProofImages, uploadProfileImage };
