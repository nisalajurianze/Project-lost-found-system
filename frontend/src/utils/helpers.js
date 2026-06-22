// ============================================
// Frontend Heuristic UI Helpers
// Styling state builders, text truncaters, initials
// ============================================

/**
 * Capitalizes the first letter of a string.
 */
export const capitalize = (str) => {
  if (!str) return '';
  return str.replace(/_/g, ' ').charAt(0).toUpperCase() + str.replace(/_/g, ' ').slice(1);
};

/**
 * Truncates text with an ellipsis if it exceeds max length.
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Returns Tailwind badge classes for lost/found item statuses.
 */
export const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    // Lost Item statuses
    case 'pending':
      return 'badge-warning'; // yellow
    case 'matched':
      return 'badge-primary'; // indigo / blue
    case 'claimed':
      return 'badge-success'; // green
    case 'closed':
      return 'badge-neutral'; // grey
    
    // Found Item statuses
    case 'available':
      return 'badge-success'; // green

    // Claim request status
    case 'approved':
      return 'badge-success';
    case 'rejected':
      return 'badge-danger';
    case 'in_progress':
      return 'badge-warning'; // yellow
    
    default:
      return 'badge-neutral';
  }
};

/**
 * Returns Tailwind badge classes for category-specific tags.
 */
export const getCategoryIcon = (category) => {
  const icons = {
    'Electronics & Gadgets': '📱',
    'Books & Stationery': '📚',
    'Keys & Keychains': '🔑',
    'Wallets & Purses': '💼',
    'Identity & Cards': '🪪',
    'Bags & Backpacks': '🎒',
    'Clothing & Apparel': '👕',
    'Watches & Jewelry': '⌚',
    'Water Bottles & Flasks': '🍼',
    'Glasses & Eyewear': '🕶️',
    'Sports Gear': '⚽',
    'Others': '📦'
  };
  return icons[category] || '📦';
};

/**
 * Parses initials from full name.
 */
export const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

/**
 * Returns Tailwind colors based on AI match similarity score.
 */
export const getConfidenceColor = (score) => {
  if (score >= 80) return 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20';
  if (score >= 60) return 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20';
  return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20';
};

/**
 * Returns confidence label text based on AI match similarity score.
 */
export const getConfidenceLabel = (score) => {
  if (score >= 80) return 'High';
  if (score >= 60) return 'Medium';
  if (score >= 40) return 'Low';
  return 'None';
};

/**
 * Optimizes a Cloudinary image URL for faster loading.
 * Injects format, quality, and sizing transformations.
 */
export const optimizeImageUrl = (url, width = 800) => {
  if (!url) return null;
  const secureUrl = url.replace(/^http:\/\//i, 'https://');
  
  // Apply Cloudinary optimizations only if it's a Cloudinary URL and doesn't already have them
  if (secureUrl.includes('res.cloudinary.com') && secureUrl.includes('/upload/')) {
    if (!secureUrl.includes('/upload/f_auto')) {
      return secureUrl.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
    }
  }
  
  return secureUrl;
};
