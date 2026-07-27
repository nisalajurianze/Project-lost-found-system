export const IMAGE_REDACTION_ERROR_CODES = Object.freeze({
  FILE_REQUIRED: 'IMAGE_REDACTION_FILE_REQUIRED',
  DECODE_FAILED: 'IMAGE_REDACTION_DECODE_FAILED',
  INVALID_DIMENSIONS: 'IMAGE_REDACTION_INVALID_DIMENSIONS',
  CANVAS_UNAVAILABLE: 'IMAGE_REDACTION_CANVAS_UNAVAILABLE',
  CREATE_FAILED: 'IMAGE_REDACTION_CREATE_FAILED',
});

const createImageRedactionError = (code, cause) => {
  const error = new Error(code, cause ? { cause } : undefined);
  error.code = code;
  return error;
};

export const imageFileKey = (file) => [
  String(file?.name || 'image'),
  Number(file?.size || 0),
  Number(file?.lastModified || 0),
  String(file?.type || ''),
].join(':');

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

export const normalizeRedactionRegions = (regions = []) => (
  (Array.isArray(regions) ? regions : [])
    .map((region) => {
      const x = clamp01(region?.x);
      const y = clamp01(region?.y);
      const width = Math.min(1 - x, clamp01(region?.width));
      const height = Math.min(1 - y, clamp01(region?.height));
      if (width <= 0 || height <= 0) return null;
      return {
        x,
        y,
        width,
        height,
        reason: String(region?.reason || 'sensitive-content').slice(0, 80),
      };
    })
    .filter(Boolean)
    .slice(0, 20)
);

const loadImageSource = async (file) => {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return {
        source: bitmap,
        width: bitmap.width,
        height: bitmap.height,
        dispose: () => bitmap.close?.(),
      };
    } catch (cause) {
      throw createImageRedactionError(IMAGE_REDACTION_ERROR_CODES.DECODE_FAILED, cause);
    }
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = (cause) => reject(createImageRedactionError(IMAGE_REDACTION_ERROR_CODES.DECODE_FAILED, cause));
      element.src = objectUrl;
    });
    return {
      source: image,
      width: image.naturalWidth,
      height: image.naturalHeight,
      dispose: () => URL.revokeObjectURL(objectUrl),
    };
  } catch (error) {
    URL.revokeObjectURL(objectUrl);
    throw error;
  }
};

const canvasToBlob = (canvas, type, quality) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => {
    if (blob) resolve(blob);
    else reject(createImageRedactionError(IMAGE_REDACTION_ERROR_CODES.CREATE_FAILED));
  }, type, quality);
});

export const createPrivacySafeImage = async (file, regions, { pixelSize = 18 } = {}) => {
  if (!(file instanceof Blob)) {
    throw createImageRedactionError(IMAGE_REDACTION_ERROR_CODES.FILE_REQUIRED);
  }

  const safeRegions = normalizeRedactionRegions(regions);
  if (safeRegions.length === 0) return file;

  const loaded = await loadImageSource(file);
  try {
    if (!loaded.width || !loaded.height) {
      throw createImageRedactionError(IMAGE_REDACTION_ERROR_CODES.INVALID_DIMENSIONS);
    }

    const canvas = document.createElement('canvas');
    canvas.width = loaded.width;
    canvas.height = loaded.height;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) {
      throw createImageRedactionError(IMAGE_REDACTION_ERROR_CODES.CANVAS_UNAVAILABLE);
    }
    context.drawImage(loaded.source, 0, 0, loaded.width, loaded.height);

    for (const region of safeRegions) {
      const paddingX = Math.max(2, Math.round(loaded.width * 0.006));
      const paddingY = Math.max(2, Math.round(loaded.height * 0.006));
      const x = Math.max(0, Math.floor(region.x * loaded.width) - paddingX);
      const y = Math.max(0, Math.floor(region.y * loaded.height) - paddingY);
      const width = Math.min(loaded.width - x, Math.ceil(region.width * loaded.width) + paddingX * 2);
      const height = Math.min(loaded.height - y, Math.ceil(region.height * loaded.height) + paddingY * 2);
      if (width <= 0 || height <= 0) continue;

      const sampleWidth = Math.max(1, Math.ceil(width / pixelSize));
      const sampleHeight = Math.max(1, Math.ceil(height / pixelSize));
      const scratch = document.createElement('canvas');
      scratch.width = sampleWidth;
      scratch.height = sampleHeight;
      const scratchContext = scratch.getContext('2d', { alpha: false });
      if (!scratchContext) continue;
      scratchContext.drawImage(canvas, x, y, width, height, 0, 0, sampleWidth, sampleHeight);
      context.save();
      context.imageSmoothingEnabled = false;
      context.drawImage(scratch, 0, 0, sampleWidth, sampleHeight, x, y, width, height);
      context.restore();
    }

    const requestedType = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ? file.type : 'image/jpeg';
    const blob = await canvasToBlob(canvas, requestedType, 0.9);
    const baseName = String(file.name || 'item-photo').replace(/\.[^.]+$/, '');
    const extension = requestedType === 'image/png' ? 'png' : requestedType === 'image/webp' ? 'webp' : 'jpg';
    return new File([blob], `${baseName}-privacy-safe.${extension}`, {
      type: requestedType,
      lastModified: Date.now(),
    });
  } finally {
    loaded.dispose();
  }
};
