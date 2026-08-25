import React, { useEffect, useState } from 'react';
import { Calendar, CheckCircle, HelpCircle, MapPin, Package, Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { fetchLostItems, deleteLostReport } from '../../redux/slices/lostItemSlice';
import { fetchFoundItems, deleteFoundReport } from '../../redux/slices/foundItemSlice';
import { fetchCategories } from '../../redux/slices/categorySlice';
import SearchFilter from '../common/SearchFilter';
import Pagination from '../common/Pagination';
import Loader from '../common/Loader';
import EmptyState from '../common/EmptyState';
import ConfirmDialog from '../common/ConfirmDialog';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';
import { getInitials, optimizeImageUrl } from '../../utils/helpers';
import { useLanguage } from '../../i18n/LanguageContext';

const CONFIG = {
  lost: {
    stateKey: 'lostItems', fetchAction: fetchLostItems, deleteAction: deleteLostReport,
    locationField: 'lostLocation', dateField: 'lostDate', icon: HelpCircle,
    titleKey: 'reportAdmin.lostTitle', subtitleKey: 'reportAdmin.lostSubtitle', loadErrorKey: 'reportAdmin.lostLoadError',
    emptyTitleKey: 'reportAdmin.lostEmptyTitle', emptyMessageKey: 'reportAdmin.lostEmptyMessage',
    confirmTitleKey: 'reportAdmin.lostArchiveTitle', confirmMessageKey: 'reportAdmin.lostArchiveMessage', successKey: 'reportAdmin.lostArchiveSuccess',
    statuses: ['pending', 'matched', 'in_progress', 'claimed', 'closed'],
  },
  found: {
    stateKey: 'foundItems', fetchAction: fetchFoundItems, deleteAction: deleteFoundReport,
    locationField: 'foundLocation', dateField: 'foundDate', icon: CheckCircle,
    titleKey: 'reportAdmin.foundTitle', subtitleKey: 'reportAdmin.foundSubtitle', loadErrorKey: 'reportAdmin.foundLoadError',
    emptyTitleKey: 'reportAdmin.foundEmptyTitle', emptyMessageKey: 'reportAdmin.foundEmptyMessage',
    confirmTitleKey: 'reportAdmin.foundArchiveTitle', confirmMessageKey: 'reportAdmin.foundArchiveMessage', successKey: 'reportAdmin.foundArchiveSuccess',
    statuses: ['available', 'matched', 'in_progress', 'claimed'],
  },
};

const AdminReportModeration = ({ type }) => {
  const config = CONFIG[type];
  const dispatch = useDispatch();
  const { t, language } = useLanguage();
  const { items, pagination, isLoading, error } = useSelector((state) => state[config.stateKey]);
  const { categories } = useSelector((state) => state.categories);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [archiveId, setArchiveId] = useState(null);
  const locale = language === 'si' ? 'si-LK' : language === 'ta' ? 'ta-LK' : 'en-LK';
  const Icon = config.icon;

  useEffect(() => { dispatch(fetchCategories()); }, [dispatch]);
  useEffect(() => {
    dispatch(config.fetchAction({ search, category, status, sort: '-createdAt', page, limit: 10 }));
  }, [dispatch, config, search, category, status, page]);

  const archiveReport = async () => {
    if (!archiveId) return;
    try {
      await dispatch(config.deleteAction(archiveId)).unwrap();
      toast.success(t(config.successKey));
    } catch (err) {
      toast.error(err || t('reportAdmin.archiveError'));
    } finally {
      setArchiveId(null);
    }
  };

  const statusOptions = config.statuses.map((entry) => ({ value: entry, label: t(`reportAdmin.status.${entry}`) }));

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white"><Icon aria-hidden="true" className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />{t(config.titleKey)}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t(config.subtitleKey)}</p>
      </header>

      <SearchFilter search={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} category={category} onCategoryChange={(value) => { setCategory(value); setPage(1); }} status={status} onStatusChange={(value) => { setStatus(value); setPage(1); }} categories={categories} statusOptions={statusOptions} onClear={() => { setSearch(''); setCategory(''); setStatus(''); setPage(1); }} />

      {isLoading ? <Loader /> : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{t(config.loadErrorKey, { error })}</div>
      ) : items.length === 0 ? (
        <EmptyState title={t(config.emptyTitleKey)} message={t(config.emptyMessageKey)} />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {items.map((item) => (
              <article key={item._id} className="card group flex flex-col gap-5 border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60 md:flex-row">
                <div className="flex h-32 w-full flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-800 md:w-32">
                  {item.images?.[0]?.url ? <img src={optimizeImageUrl(item.images[0].url, 200)} alt={item.itemName} className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" /> : <Icon aria-hidden="true" className="h-10 w-10 text-slate-400" />}
                </div>
                <div className="flex flex-1 flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2"><div><h2 className="text-base font-semibold text-slate-900 dark:text-white">{item.itemName}</h2><span className="rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-600 dark:border-indigo-900/30 dark:bg-indigo-950/40 dark:text-indigo-400">{item.category}</span></div><StatusBadge status={item.status} /></div>
                    <p className="mt-2 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{item.description}</p>
                    <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800"><div className="flex items-center gap-1"><MapPin aria-hidden="true" className="h-3.5 w-3.5" /><span className="truncate">{item[config.locationField]}</span></div><div className="flex items-center gap-1"><Calendar aria-hidden="true" className="h-3.5 w-3.5" /><span>{new Date(item[config.dateField]).toLocaleDateString(locale)}</span></div></div>
                    {type === 'found' && item.storedAt && <div className="mt-2 flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400"><Package aria-hidden="true" className="h-3.5 w-3.5" />{t('reportAdmin.storedAt', { location: item.storedAt })}</div>}
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-4 border-t border-slate-100 pt-3 dark:border-slate-800"><div className="flex min-w-0 items-center gap-2"><div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-300">{getInitials(item.userId?.fullName)}</div><span className="max-w-[140px] truncate text-xs text-slate-600 dark:text-slate-400">{item.userId?.fullName || t('reportAdmin.deletedUser')}</span></div><Button variant="danger" size="sm" title={t('reportAdmin.archiveAction')} onClick={() => setArchiveId(item._id)}><Trash2 aria-hidden="true" className="h-4 w-4" /></Button></div>
                </div>
              </article>
            ))}
          </div>
          {pagination.totalPages > 1 && <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />}
        </div>
      )}

      {archiveId && <ConfirmDialog isOpen onClose={() => setArchiveId(null)} onConfirm={archiveReport} title={t(config.confirmTitleKey)} message={t(config.confirmMessageKey)} confirmText={t('reportAdmin.archiveConfirm')} variant="danger" />}
    </div>
  );
};

export default AdminReportModeration;
