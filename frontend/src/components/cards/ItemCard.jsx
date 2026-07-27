import React from 'react';
import { Link } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import { getCategoryIcon, optimizeImageUrl } from '../../utils/helpers';
import { formatRelativeTime } from '../../utils/formatDate';
import { FiMapPin, FiClock, FiMessageSquare, FiArrowRight } from 'react-icons/fi';
import Button from '../common/Button';
import { useLanguage } from '../../i18n/LanguageContext';

export const ItemCard = React.memo(({ item, type = 'lost', onFeedback, view = 'grid' }) => {
  const { t } = useLanguage();
  const isLost = type === 'lost';
  const detailPath = isLost ? `/lost-items/${item._id}` : `/found-items/${item._id}`;
  const displayLocation = isLost ? item.lostLocation : item.foundLocation;
  const displayDate = isLost ? item.lostDate : item.foundDate;
  const rawImage = item.images?.[0]?.url || null;
  const mainImage = optimizeImageUrl(rawImage, view === 'list' ? 240 : 400);
  const listMode = view === 'list';

  return (
    <article className={`glass-card-hover ${isLost ? 'lost-card-hover' : 'found-card-hover'} ${listMode ? 'grid grid-cols-[8rem_1fr] sm:grid-cols-[12rem_1fr]' : 'flex h-full flex-col'} overflow-hidden group`}>
      <Link to={detailPath} className={`relative block bg-surface-100 dark:bg-surface-800 overflow-hidden focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary-500 ${listMode ? 'min-h-40' : 'aspect-[4/3]'}`} aria-label={`${t('search.viewDetails')}: ${item.itemName}`}>
        {mainImage ? <img src={mainImage} alt={item.itemName} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03]" /> : <div className="flex h-full min-h-40 w-full flex-col items-center justify-center bg-gradient-to-br from-primary-950/20 to-primary-950/5 px-3 text-center text-4xl text-primary-500/50"><span aria-hidden="true">{getCategoryIcon(item.category)}</span><span className="mt-2 text-xs font-semibold uppercase tracking-wider text-surface-500">{t('search.noImage')}</span></div>}
        <div className="absolute right-3 top-3"><StatusBadge status={item.status} /></div>
      </Link>

      <div className="flex min-w-0 flex-1 flex-col justify-between p-4">
        <div>
          <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-0.5 text-xs font-extrabold uppercase ${isLost ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-200' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200'}`}>{t(isLost ? 'search.lost' : 'search.found')}</span><span className="text-sm font-bold text-primary-600 dark:text-primary-300">{getCategoryIcon(item.category)} {item.category}</span></div>
          <h3 className="mt-2 line-clamp-1 text-lg font-bold leading-snug text-surface-900 dark:text-white">{item.itemName}</h3>
          <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-surface-600 dark:text-surface-300">{item.description}</p>
        </div>
        <div className="mt-4 space-y-2 border-t border-surface-100 pt-3 text-sm text-surface-500 dark:border-surface-700/50 dark:text-surface-400"><p className="flex items-start gap-2"><FiMapPin className="mt-0.5 flex-none" aria-hidden="true" /><span className="break-words">{displayLocation}</span></p><p className="flex items-center gap-2"><FiClock className="flex-none" aria-hidden="true" /><span>{formatRelativeTime(displayDate)}</span></p></div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link to={detailPath} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 text-sm font-bold text-white hover:bg-primary-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary-300">{t('search.viewDetails')} <FiArrowRight aria-hidden="true" /></Link>
          {item.status === 'claimed' && onFeedback && <Button variant="outline" size="sm" onClick={() => onFeedback(item)} icon={<FiMessageSquare />} className="min-h-11 justify-center text-amber-600 border-amber-500/30">{t('common.feedback')}</Button>}
        </div>
      </div>
    </article>
  );
});
export default ItemCard;
