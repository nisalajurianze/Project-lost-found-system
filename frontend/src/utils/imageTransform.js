export const IMAGE_TRANSFORM_ERROR_CODES = Object.freeze({
  FILE_REQUIRED: 'IMAGE_TRANSFORM_FILE_REQUIRED',
  OPEN_FAILED: 'IMAGE_TRANSFORM_OPEN_FAILED',
  CANVAS_UNAVAILABLE: 'IMAGE_TRANSFORM_CANVAS_UNAVAILABLE',
  CREATE_FAILED: 'IMAGE_TRANSFORM_CREATE_FAILED',
});

const createImageTransformError = (code, cause) => {
  const error = new Error(code, cause ? { cause } : undefined);
  error.code = code;
  return error;
};

const normalizeRotation = (degrees = 0) => ((Number(degrees) % 360) + 360) % 360;

const calculateTransformGeometry = (width, height, { rotation = 0, cropSquare = false } = {}) => {
  const sourceWidth = Math.max(1, Number(width) || 1);
  const sourceHeight = Math.max(1, Number(height) || 1);
  const size = cropSquare ? Math.min(sourceWidth, sourceHeight) : null;
  const sx = cropSquare ? (sourceWidth - size) / 2 : 0;
  const sy = cropSquare ? (sourceHeight - size) / 2 : 0;
  const sw = cropSquare ? size : sourceWidth;
  const sh = cropSquare ? size : sourceHeight;
  const resolvedRotation = normalizeRotation(rotation);
  const swapsAxes = resolvedRotation === 90 || resolvedRotation === 270;
  return {
    sx,
    sy,
    sw,
    sh,
    rotation: resolvedRotation,
    outputWidth: Math.round(swapsAxes ? sh : sw),
    outputHeight: Math.round(swapsAxes ? sw : sh),
  };
};

const loadBrowserImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    URL.revokeObjectURL(url);
    resolve(image);
  };
  image.onerror = (cause) => {
    URL.revokeObjectURL(url);
    reject(createImageTransformError(IMAGE_TRANSFORM_ERROR_CODES.OPEN_FAILED, cause));
  };
  image.src = url;
});

const canvasToBlob = (canvas, type) => new Promise((resolve, reject) => {
  canvas.toBlob((blob) => (
    blob
      ? resolve(blob)
      : reject(createImageTransformError(IMAGE_TRANSFORM_ERROR_CODES.CREATE_FAILED))
  ), type, 0.92);
});

const transformImageFile = async (file, options = {}) => {
  if (!(file instanceof Blob)) {
    throw createImageTransformError(IMAGE_TRANSFORM_ERROR_CODES.FILE_REQUIRED);
  }

  const image = await loadBrowserImage(file);
  const geometry = calculateTransformGeometry(image.naturalWidth, image.naturalHeight, options);
  const canvas = document.createElement('canvas');
  canvas.width = geometry.outputWidth;
  canvas.height = geometry.outputHeight;
  const context = canvas.getContext('2d');
  if (!context) {
    throw createImageTransformError(IMAGE_TRANSFORM_ERROR_CODES.CANVAS_UNAVAILABLE);
  }

  context.translate(canvas.width / 2, canvas.height / 2);
  context.rotate((geometry.rotation * Math.PI) / 180);
  context.drawImage(
    image,
    geometry.sx,
    geometry.sy,
    geometry.sw,
    geometry.sh,
    -geometry.sw / 2,
    -geometry.sh / 2,
    geometry.sw,
    geometry.sh,
  );

  const type = ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ? file.type : 'image/jpeg';
  const blob = await canvasToBlob(canvas, type);
  const originalName = String(file.name || 'item-photo').replace(/\.[^.]+$/, '');
  const extension = type === 'image/png' ? 'png' : type === 'image/webp' ? 'webp' : 'jpg';
  return new File([blob], `${originalName}-edited.${extension}`, { type, lastModified: Date.now() });
};

export { normalizeRotation, calculateTransformGeometry, transformImageFile };
