import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, MessageSquare, Reply, Star } from 'lucide-react';
import toast from 'react-hot-toast';
import Button from '../../components/common/Button';
import EmptyState from '../../components/common/EmptyState';
import Loader from '../../components/common/Loader';
import Modal from '../../components/common/Modal';
import Pagination from '../../components/common/Pagination';
import Select from '../../components/common/Select';
import Textarea from '../../components/common/Textarea';
import { useLanguage } from '../../i18n/LanguageContext';
import api from '../../services/api';
import { getInitials } from '../../utils/helpers';

const FEEDBACK_CATEGORIES = ['general', 'bug_report', 'feature_request', 'complaint', 'praise'];
const FEEDBACK_STATUSES = ['pending', 'reviewed', 'resolved'];

const Feedback = () => {
  const { t, language } = useLanguage();
  const [feedbacks, setFeedbacks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalDocs: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState('');
  const [rating, setRating] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [responseItem, setResponseItem] = useState(null);
  const [adminResponse, setAdminResponse] = useState('');
  const [responseStatus, setResponseStatus] = useState('reviewed');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const locale = language === 'si' ? 'si-LK' : language === 'ta' ? 'ta-LK' : 'en-LK';

  const fetchFeedbackData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api.get('/feedback', { params: { category, rating, status, page, limit: 10 } });
      setFeedbacks(response.data.data.feedbacks || []);
      setPagination(response.data.data.pagination || { page: 1, limit: 10, totalPages: 1, totalDocs: 0 });
    } catch (requestError) {
      setError(requestError.response?.data?.message || t('feedbackAdmin.responseError'));
    } finally {
      setIsLoading(false);
    }
  }, [category, page, rating, status, t]);

  useEffect(() => {
    fetchFeedbackData();
  }, [fetchFeedbackData]);

  const categoryOptions = useMemo(() => FEEDBACK_CATEGORIES.map((value) => ({ value, label: t(`feedbackAdmin.category.${value}`) })), [t]);
  const ratingOptions = useMemo(() => [5, 4, 3, 2, 1].map((value) => ({
    value: String(value),
    label: t(value === 1 ? 'feedbackAdmin.oneStar' : 'feedbackAdmin.stars', { count: value }),
  })), [t]);
  const statusOptions = useMemo(() => FEEDBACK_STATUSES.map((value) => ({ value, label: t(`feedbackAdmin.status.${value}`) })), [t]);

  const openResponse = useCallback((item) => {
    setResponseItem(item);
    setAdminResponse(item.adminResponse || '');
    setResponseStatus(item.status === 'resolved' ? 'resolved' : 'reviewed');
  }, []);

  const closeResponse = useCallback(() => {
    setResponseItem(null);
    setAdminResponse('');
    setResponseStatus('reviewed');
  }, []);

  const submitResponse = async (event) => {
    event.preventDefault();
    if (!responseItem) return;
    setIsSubmitting(true);
    try {
      await api.put(`/feedback/${responseItem._id}/respond`, { adminResponse, status: responseStatus });
      toast.success(t('feedbackAdmin.success'));
      closeResponse();
      await fetchFeedbackData();
    } catch {
      toast.error(t('feedbackAdmin.responseError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (count) => (
    <div className="flex text-amber-400" aria-label={t(count === 1 ? 'feedbackAdmin.oneStar' : 'feedbackAdmin.stars', { count })}>
      {[0, 1, 2, 3, 4].map((index) => <Star aria-hidden="true" key={index} className={`h-4 w-4 ${index < count ? 'fill-current' : 'text-slate-200 dark:text-slate-700'}`} />)}
    </div>
  );

  const formatDate = (value) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? t('feedbackAdmin.notRecorded') : new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24">
      <header>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          <MessageSquare aria-hidden="true" className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          {t('feedbackAdmin.title')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('feedbackAdmin.subtitle')}</p>
      </header>

      <section className="card border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="grid gap-4 sm:grid-cols-3">
          <Select label={t('feedbackAdmin.category')} value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} options={categoryOptions} placeholder={t('feedbackAdmin.allCategories')} />
          <Select label={t('feedbackAdmin.rating')} value={rating} onChange={(event) => { setRating(event.target.value); setPage(1); }} options={ratingOptions} placeholder={t('feedbackAdmin.allRatings')} />
          <Select label={t('feedbackAdmin.status')} value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} options={statusOptions} placeholder={t('feedbackAdmin.allStatuses')} />
        </div>
      </section>

      <p className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100">{t('feedbackAdmin.originalContentNotice')}</p>

      {isLoading ? <Loader /> : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">{t('feedbackAdmin.loadError', { error })}</div>
      ) : !feedbacks.length ? (
        <EmptyState title={t('feedbackAdmin.emptyTitle')} message={t('feedbackAdmin.emptyMessage')} />
      ) : (
        <div className="space-y-4">
          {feedbacks.map((item) => {
            const userName = item.userId?.fullName || t('feedbackAdmin.deletedUser');
            return (
              <article key={item._id} className="card space-y-4 border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {item.userId?.profileImage?.url ? <img src={item.userId.profileImage.url} alt={userName} className="h-full w-full object-cover" /> : getInitials(userName)}
                    </div>
                    <div><p className="font-semibold text-slate-900 dark:text-white">{userName}</p><p className="font-mono text-xs text-slate-400">{item.userId?.studentId || t('feedbackAdmin.notRecorded')}</p></div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">{renderStars(item.rating)}<time className="text-[11px] text-slate-400" dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></div>
                </div>

                <div className="space-y-1">
                  <span className="inline-flex rounded border border-indigo-100/30 bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">{t(`feedbackAdmin.category.${item.category}`, undefined, item.category)}</span>
                  <h2 className="pt-1 font-semibold text-slate-950 dark:text-white">{item.subject}</h2>
                  <p className="whitespace-pre-wrap pt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-400">{item.message}</p>
                </div>

                {item.adminResponse ? (
                  <div className="space-y-2 rounded-lg border border-indigo-100/30 bg-indigo-50/30 p-4 dark:border-indigo-900/30 dark:bg-indigo-950/10">
                    <div className="flex items-center gap-2 text-xs font-semibold text-indigo-700 dark:text-indigo-400"><CheckCircle2 aria-hidden="true" className="h-4 w-4" />{t('feedbackAdmin.officialResponse')}</div>
                    <p className="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-400">{item.adminResponse}</p>
                    <div className="flex justify-end"><Button type="button" variant="ghost" size="sm" onClick={() => openResponse(item)} icon={<Reply aria-hidden="true" className="h-4 w-4" />}>{t('feedbackAdmin.editResponse')}</Button></div>
                  </div>
                ) : (
                  <div className="flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800"><Button type="button" variant="secondary" size="sm" onClick={() => openResponse(item)} icon={<Reply aria-hidden="true" className="h-4 w-4" />}>{t('feedbackAdmin.writeResponse')}</Button></div>
                )}
              </article>
            );
          })}
          {pagination.totalPages > 1 && <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />}
        </div>
      )}

      <Modal isOpen={Boolean(responseItem)} onClose={closeResponse} title={t('feedbackAdmin.respondTitle')} size="md">
        {responseItem && (
          <form onSubmit={submitResponse} className="space-y-4 pt-2">
            <div className="rounded-lg bg-slate-50 p-3 text-sm dark:bg-slate-800/50"><p className="font-semibold text-slate-900 dark:text-white">{t('feedbackAdmin.subject', { subject: responseItem.subject })}</p><p className="mt-1 whitespace-pre-wrap text-slate-500">{responseItem.message}</p></div>
            <Textarea label={t('feedbackAdmin.responseLabel')} placeholder={t('feedbackAdmin.responsePlaceholder')} value={adminResponse} onChange={(event) => setAdminResponse(event.target.value)} required rows={4} maxLength={1000} />
            <Select label={t('feedbackAdmin.responseStatus')} value={responseStatus} onChange={(event) => setResponseStatus(event.target.value)} options={statusOptions.filter((option) => option.value !== 'pending')} />
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800"><Button type="button" variant="secondary" onClick={closeResponse} disabled={isSubmitting}>{t('feedbackAdmin.cancel')}</Button><Button type="submit" variant="primary" isLoading={isSubmitting}>{t('feedbackAdmin.submit')}</Button></div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default Feedback;
