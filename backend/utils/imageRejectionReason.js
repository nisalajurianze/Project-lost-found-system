// Use controlled messages, never echo model-generated descriptions or OCR.
export const imageRejectionReason = (result) => {
  if (['sexual', 'unsafe', 'nonItem', 'spam', 'quality', 'rejected'].includes(result.rejectionReason)) return result.rejectionReason;
  const labels = [result.rejectionReason, ...(Array.isArray(result.safetyLabels) ? result.safetyLabels : [])].join(' ').toLowerCase();
  if (/sexual|nudity|porn|adult|explicit/.test(labels)) return 'sexual';
  if (/violence|gore|hate|illegal/.test(labels)) return 'unsafe';
  if (/poster|advert|meme|screenshot/.test(labels)) return 'nonItem';
  if (result.isSpam) return 'spam';
  if (result.isItemPhoto === false) return 'nonItem';
  if (result.imageQuality === 'poor') return 'quality';
  return 'rejected';
};

export const imageRejectionMessages = {
  sexual: 'Photo removed: sexual or adult content is not allowed. Upload a clear photo of the item.',
  unsafe: 'Photo removed: unsafe content was detected. Upload a clear photo of the item.',
  nonItem: 'Photo removed: this was not identified as a physical lost-and-found item photo. Posters, screenshots and unrelated images are not accepted.',
  spam: 'Photo removed: the image was flagged as spam or promotional content. Upload a photo of the item.',
  quality: 'Photo removed: the item is not clear enough to verify. Take a clearer photo with good lighting.',
  rejected: 'Photo removed: the safety check did not approve this image. Upload a different, clear photo of the item.',
};
