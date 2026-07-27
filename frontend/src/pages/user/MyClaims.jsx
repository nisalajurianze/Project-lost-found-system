// ============================================
// My Claims Page Component
// Lists ownership claim requests submitted by student
// and allows founders to review claims on their items
// ============================================

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClaims, reviewClaimRequest, shareClaimContact } from '../../redux/slices/claimSlice';
import foundItemService from '../../services/foundItemService';
import lostItemService from '../../services/lostItemService';
import ClaimCard from '../../components/cards/ClaimCard';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Textarea from '../../components/common/Textarea';
import FeedbackModal from '../../components/common/FeedbackModal';
import toast from 'react-hot-toast';
import { useLanguage } from '../../i18n/LanguageContext';

export const MyClaims = () => {
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const { claims, isLoading, pagination } = useSelector((state) => state.claims);
  const { notifications } = useSelector((state) => state.notifications);
  const { user } = useSelector((state) => state.auth);

  const [page, setPage] = useState(1);

  // Review Dialog state
  const [reviewDialog, setReviewDialog] = useState(null); // { id, status }
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Feedback Modal state
  const [feedbackDialog, setFeedbackDialog] = useState(null); // claim object

  useEffect(() => {
    dispatch(fetchClaims({ page, limit: 9 }));
  }, [dispatch, page]);

  // Refetch claims when a new notification arrives (e.g. contact shared, claim approved)
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const latestNotification = notifications[0];
      // If it's a claim related notification, refetch to get updated status/contact info
      if (
        latestNotification?.type === 'contact_shared' ||
        latestNotification?.type === 'claim_approved' ||
        latestNotification?.type === 'claim_rejected' ||
        latestNotification?.type === 'claim_submitted'
      ) {
        dispatch(fetchClaims({ page, limit: 9 }));
      }
    }
  }, [notifications, dispatch, page]);

  const handleOpenReview = (claimId, reviewStatus) => {
    setReviewDialog({ id: claimId, status: reviewStatus });
    setRemark('');
  };

  const handleCloseReview = () => {
    setReviewDialog(null);
    setRemark('');
  };

  const handleShareContact = async (claimId) => {
    if (window.confirm(t('myClaims.shareConfirm'))) {
      try {
        await dispatch(shareClaimContact(claimId)).unwrap();
        toast.success(t('myClaims.shareSuccess'));
      } catch (err) {
        toast.error(t('myClaims.shareError'));
      }
    }
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

      toast.success(t('myClaims.reviewSuccess', { status: reviewDialog.status }));
      handleCloseReview();
      // Reload current page
      dispatch(fetchClaims({ page, limit: 9 }));
    } catch (err) {
      toast.error(t('myClaims.reviewError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolveItem = async (targetItemId, itemType, canReview) => {
    let confirmMsg;
    if (itemType === 'Found Item') {
      confirmMsg = canReview
        ? t('detail.confirmHandoverQuestion')
        : t('detail.confirmReceivedQuestion');
    } else {
      confirmMsg = canReview
        ? t('detail.confirmReceivedQuestion')
        : t('detail.confirmHandoverQuestion');
    }
    if (window.confirm(confirmMsg)) {
      try {
        if (itemType === 'Found Item') {
          await foundItemService.resolveFoundItem(targetItemId);
        } else {
          await lostItemService.resolveLostItem(targetItemId);
        }
        toast.success(t('detail.resolvedSuccess'));
        dispatch(fetchClaims({ page, limit: 9 }));
      } catch (err) {
        toast.error(t('detail.resolveError'));
      }
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title text-3xl font-extrabold font-display text-surface-900 dark:text-white">
          {t('myClaims.title')}
        </h1>
        <p className="page-subtitle text-sm text-surface-500 dark:text-surface-400 mt-1">
          {t('myClaims.subtitle')}
        </p>
      </div>

      {isLoading && claims.length === 0 ? (
        <Loader fullPage />
      ) : claims.length === 0 ? (
        <EmptyState
          title={t('myClaims.emptyTitle')}
          description={t('myClaims.emptyDesc')}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {claims.map((claim) => {
              const targetItem = claim.foundItemId || claim.lostItemId;
              const targetUserId = typeof targetItem?.userId === 'object' ? targetItem.userId._id : targetItem?.userId;
              const isFounder = targetUserId === user?._id;

              return (
                <ClaimCard
                  key={claim._id}
                  claim={claim}
                  canReview={isFounder}
                  onReview={handleOpenReview}
                  onShareContact={handleShareContact}
                  onResolve={handleResolveItem}
                  onFeedback={(claim) => setFeedbackDialog(claim)}
                />
              );
            })}
          </div>

          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            hasNextPage={pagination.hasNextPage}
            hasPrevPage={pagination.hasPrevPage}
            onPageChange={(nextPage) => setPage(nextPage)}
          />
        </>
      )}

      {/* Review Remarks Modal */}
      {reviewDialog && (
        <Modal
          isOpen={!!reviewDialog}
          onClose={handleCloseReview}
          title={reviewDialog.status === 'approved' ? t('myClaims.approveTitle') : t('myClaims.rejectTitle')}
          size="md"
        >
          <form onSubmit={handleSubmitReview} className="space-y-4 pt-2">
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {reviewDialog.status === 'approved'
                ? t('myClaims.approveDesc')
                : t('myClaims.rejectDesc')
              }
            </p>

            <Textarea
              label={t('myClaims.remarkLabel')}
              placeholder={reviewDialog.status === 'approved'
                ? t('myClaims.approvePlaceholder')
                : t('myClaims.rejectPlaceholder')
              }
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              required={reviewDialog.status === 'rejected'}
              rows={4}
            />

            <div className="flex gap-2 justify-end border-t border-surface-100 dark:border-surface-800 pt-4 mt-6">
              <Button
                variant="secondary"
                onClick={handleCloseReview}
                disabled={isSubmitting}
                type="button"
              >
                {t('myClaims.cancel')}
              </Button>
              <Button
                variant={reviewDialog.status === 'approved' ? 'success' : 'danger'}
                type="submit"
                loading={isSubmitting}
              >
                {reviewDialog.status === 'approved' ? t('myClaims.connectVerify') : t('myClaims.reject')}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Feedback Modal */}
      {feedbackDialog && (
        <FeedbackModal
          isOpen={!!feedbackDialog}
          onClose={() => setFeedbackDialog(null)}
          defaultSubject={t('myClaims.feedbackSubject', { item: feedbackDialog.foundItemId?.itemName || feedbackDialog.lostItemId?.itemName || t('myClaims.itemFallback') })}
        />
      )}

    </div>
  );
};

export default MyClaims;

