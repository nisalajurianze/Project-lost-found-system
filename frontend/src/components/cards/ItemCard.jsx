// ============================================
// Item Card Component
// Layout representation of lost & found item records
// ============================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import { getCategoryIcon, optimizeImageUrl } from '../../utils/helpers';
import { formatRelativeTime } from '../../utils/formatDate';
import { FiMapPin, FiClock } from 'react-icons/fi';

export const ItemCard = React.memo(({ item, type = 'lost' }) => {
  const [imageError, setImageError] = useState(false);
  const isLost = type === 'lost';
  const detailPath = isLost ? `/lost-items/${item._id}` : `/found-items/${item._id}`;
  
  const displayLocation = isLost ? item.lostLocation : item.foundLocation;
  const displayDate = isLost ? item.lostDate : item.foundDate;

  // Use first image or a clean CSS placeholder card
  let mainImage = !imageError && item.images && item.images.length > 0 ? item.images[0].url : null;
  mainImage = optimizeImageUrl(mainImage, 600);

  return (
    <Link to={detailPath} className="glass-card-hover flex flex-col h-full overflow-hidden">
      {/* Image Container */}
      <div className="relative w-full aspect-[4/3] bg-surface-100 dark:bg-surface-800 overflow-hidden">
        {mainImage ? (
          <img
            src={mainImage}
            alt={item.itemName}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-4xl bg-gradient-to-br from-primary-950/20 to-primary-950/5 text-primary-500/50">
            {getCategoryIcon(item.category)}
            <span className="text-xs font-semibold uppercase tracking-wider text-surface-400 mt-2 text-center px-2">
              {item.images && item.images.length > 0 ? "Image Blocked/Failed" : "No Image Provided"}
            </span>
          </div>
        )}
        
        {/* Status Pill overlay */}
        <div className="absolute top-3 right-3">
          <StatusBadge status={item.status} />
        </div>
      </div>

      {/* Item details */}
      <div className="flex-1 p-5 flex flex-col justify-between">
        <div>
          {/* Category */}
          <span className="text-xs font-bold text-primary-500 dark:text-primary-400 uppercase tracking-wide">
            {getCategoryIcon(item.category)} {item.category}
          </span>
          {/* Item Name */}
          <h4 className="text-base font-bold text-surface-900 dark:text-white mt-1 leading-snug line-clamp-1">
            {item.itemName}
          </h4>
          {/* Description */}
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-2 line-clamp-2 leading-relaxed">
            {item.description}
          </p>
        </div>

        {/* Location & Date Footer */}
        <div className="border-t border-surface-100 dark:border-surface-700/50 pt-3 mt-4 flex flex-col gap-1.5 text-xs text-surface-500 dark:text-surface-400">
          <div className="flex items-center gap-1.5 truncate">
            <FiMapPin className="text-surface-400 flex-shrink-0" />
            <span className="truncate">{displayLocation}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FiClock className="text-surface-400 flex-shrink-0" />
            <span>{formatRelativeTime(displayDate)}</span>
          </div>
        </div>
      </div>
    </Link>
  );
});

export default ItemCard;

