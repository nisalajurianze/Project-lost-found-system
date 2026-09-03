const clamp = (value) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

const assessImagePixels = ({ width, height, data }) => {
  const pixels = data || [];
  let sum = 0;
  let squared = 0;
  let count = 0;
  for (let index = 0; index < pixels.length; index += 16) {
    const luminance = (Number(pixels[index]) * 0.2126) + (Number(pixels[index + 1]) * 0.7152) + (Number(pixels[index + 2]) * 0.0722);
    sum += luminance; squared += luminance ** 2; count += 1;
  }
  const mean = count ? sum / count : 0;
  const variance = count ? Math.max(0, squared / count - mean ** 2) : 0;
  const resolution = clamp((Math.min(Number(width) || 0, Number(height) || 0) / 900) * 100);
  const exposure = clamp(100 - Math.abs(mean - 128) * 0.9);
  const sharpness = clamp((variance / 900) * 100);
  const score = clamp(resolution * 0.35 + exposure * 0.3 + sharpness * 0.35);
  const guidance = [];
  if (resolution < 45) guidance.push('move closer or use a higher-resolution photo');
  if (mean < 45) guidance.push('use more light');
  if (mean > 225) guidance.push('reduce glare or strong backlight');
  if (sharpness < 25) guidance.push('hold the camera steady and refocus');
  const acceptable = score >= 45
    && resolution >= 35
    && exposure >= 25
    && sharpness >= 15
    && Number(width) >= 320
    && Number(height) >= 320;
  return { score, resolution, exposure, sharpness, meanLuminance: Math.round(mean), guidance, acceptable };
};

const assessImageFile = async (file) => {
  const bitmap = await createImageBitmap(file);
  try {
    const canvas = document.createElement('canvas');
    canvas.width = Math.min(320, bitmap.width);
    canvas.height = Math.max(1, Math.round(bitmap.height * (canvas.width / bitmap.width)));
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) throw new Error('IMAGE_QUALITY_CANVAS_UNAVAILABLE');
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    return assessImagePixels({ width: bitmap.width, height: bitmap.height, data: imageData.data });
  } finally { bitmap.close?.(); }
};

export { assessImageFile, assessImagePixels };
