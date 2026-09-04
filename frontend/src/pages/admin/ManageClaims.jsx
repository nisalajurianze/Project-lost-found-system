import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
import { FileText, ClipboardList } from 'lucide-react';
import toast from 'react-hot-toast';
import { fetchClaims, reviewClaimRequest } from '../../redux/slices/claimSlice';
import ClaimCard from '../../components/cards/ClaimCard';
import Pagination from '../../components/common/Pagination';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Textarea from '../../components/common/Textarea';
import Select from '../../components/common/Select';
import { useLanguage } from '../../i18n/LanguageContext';

const VALID_STATUSES = new Set(['pending', 'approved', 'rejected']);

const ManageClaims = () => {
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const { claims, pagination, isLoading, error } = useSelector((state) => state.claims);
  const [searchParams, setSearchParams] = useSearchParams();

  // Keep dashboard deep links, the visible filter and API query in sync.
  const requestedStatus = searchParams.get('status') || '';
  const status = VALID_STATUSES.has(requestedStatus) ? requestedStatus : '';
  const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  // Review Dialog state
  const [reviewDialog, setReviewDialog] = useState(null); // { id, status }
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchClaims({ status, page, limit: 9 }));
  }, [dispatch, status, page]);

  const handleStatusChange = (e) => {
    const next = new URLSearchParams(searchParams);
    if (e.target.value) next.set('status', e.target.value);
    else next.delete('status');
    next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const handlePageChange = (newPage) => {
    const next = new URLSearchParams(searchParams);
    if (newPage > 1) next.set('page', String(newPage));
    else next.delete('page');
    setSearchParams(next, { replace: true });
  };

  const handleRetry = () => dispatch(fetchClaims({ status, page, limit: 9 }));

  const handleOpenReview = (claimId, reviewStatus) => {
    setReviewDialog({ id: claimId, status: reviewStatus });
    setRemark('');
  };

  const handleCloseReview = () => {
    setReviewDialog(null);
    setRemark('');
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewDialog) return;

    setIsSubmitting(true);
    try {
      await dispatch(reviewClaimRequest({
        id: reviewDialog.id,
        status: reviewDialog.status,
        adminRemark: remark
      })).unwrap();

      toast.success(t('claims.reviewSuccess', { status: t(`common.${reviewDialog.status}`, {}, reviewDialog.status) }));
      handleCloseReview();
      // Reload current page
      dispatch(fetchClaims({ status, page, limit: 9 }));
    } catch (err) {
      toast.error(err || t('claims.reviewFailure'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    { value: 'pending', label: t('common.pending') },
    { value: 'approved', label: t('common.approved') },
    { value: 'rejected', label: t('common.rejected') }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          {t('claims.adminTitle')}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t('claims.adminSubtitle')}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4">
        <div className="w-full md:w-64">
          <Select
            label={t('claims.filterStatus')}
            value={status}
            onChange={handleStatusChange}
            options={statusOptions}
            placeholder={t('claims.allStatuses')}
          />
        </div>
      </div>

      {/* Claims List */}
      {isLoading ? (
        <div className="flex min-h-52 flex-col items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/50 p-8 text-center dark:border-slate-800 dark:bg-slate-900/30">
          <Loader size="lg" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('claims.loading')}
          </p>
        </div>
      ) : error ? (
        <div className="space-y-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400" role="alert">
          <p>{t('claims.loadError', { error })}</p>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            {t('common.refresh')}
          </Button>
        </div>
      ) : claims.length === 0 ? (
        <EmptyState
          title={t('claims.emptyTitle')}
          message={t('claims.emptyMessage')}
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {claims.map((claim) => (
              <ClaimCard
                key={claim._id}
                claim={claim}
                isAdmin={true}
                isLoading={isLoading}
                onReview={handleOpenReview}
              />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              onPageChange={handlePageChange}
            />
          )}
        </div>
      )}

      {/* Review Remarks Modal */}
      {reviewDialog && (
        <Modal
          isOpen={!!reviewDialog}
          onClose={handleCloseReview}
          title={reviewDialog.status === 'approved' ? t('claims.approveTitle') : t('claims.rejectTitle')}
          size="md"
        >
          <form onSubmit={handleSubmitReview} className="space-y-4 pt-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {reviewDialog.status === 'approved'
                ? t('claims.approveDesc')
                : t('claims.rejectDesc')
              }
            </p>

            <Textarea
              label={t('claims.remarkLabel')}
              placeholder={reviewDialog.status === 'approved'
                ? t('claims.approvePlaceholder')
                : t('claims.rejectPlaceholder')
              }
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              required
              rows={4}
            />

            <div className="flex gap-2 justify-end border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
              <Button
                variant="secondary"
                onClick={handleCloseReview}
                disabled={isSubmitting}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant={reviewDialog.status === 'approved' ? 'success' : 'danger'}
                type="submit"
                loading={isSubmitting}
              >
                {reviewDialog.status === 'approved' ? t('claims.approveAction') : t('claims.rejectAction')}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ManageClaims;
