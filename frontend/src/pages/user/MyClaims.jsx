// ============================================
// My Claims Page Component
// Lists ownership claim requests submitted by student
// and allows founders to review claims on their items
// ============================================

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchClaims, reviewClaimRequest, shareClaimContact } from '../../redux/slices/claimSlice';
import ClaimCard from '../../components/cards/ClaimCard';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Textarea from '../../components/common/Textarea';
import FeedbackModal from '../../components/common/FeedbackModal';
import toast from 'react-hot-toast';

export const MyClaims = () => {
  const dispatch = useDispatch();
  const { claims, pagination, isLoading } = useSelector((state) => state.claims);
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

  const handleOpenReview = (claimId, reviewStatus) => {
    setReviewDialog({ id: claimId, status: reviewStatus });
    setRemark('');
  };

  const handleCloseReview = () => {
    setReviewDialog(null);
    setRemark('');
  };

  const handleShareContact = async (claimId) => {
    if (window.confirm('Are you sure you want to share your contact details with this claimant?')) {
      try {
        await dispatch(shareClaimContact(claimId)).unwrap();
        toast.success('Your contact details have been shared!');
      } catch (err) {
        toast.error(err || 'Failed to share contact details');
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

      toast.success(`Claim request successfully ${reviewDialog.status}.`);
      handleCloseReview();
      // Reload current page
      dispatch(fetchClaims({ page, limit: 9 }));
    } catch (err) {
      toast.error(err || 'Failed to submit claim review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="page-header">
        <h1 className="page-title text-3xl font-extrabold font-display text-surface-900 dark:text-white">
          My Ownership Claims
        </h1>
        <p className="page-subtitle text-sm text-surface-500 dark:text-surface-400 mt-1">
          Monitor your claims, or review claims made by others on items you found
        </p>
      </div>

      {isLoading && claims.length === 0 ? (
        <Loader fullPage />
      ) : claims.length === 0 ? (
        <EmptyState
          title="No claims filed yet"
          description="Submit claim requests for found property by clicking the claim button on verified matches."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {claims.map((claim) => {
              const isFounder = claim.foundItemId && claim.foundItemId.userId && claim.foundItemId.userId._id === user?._id;
              
              return (
                <ClaimCard 
                  key={claim._id} 
                  claim={claim} 
                  canReview={isFounder}
                  onReview={handleOpenReview}
                  onShareContact={handleShareContact}
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
          title={reviewDialog.status === 'approved' ? 'Connect & Share Contacts' : 'Reject Claim Request'}
          size="md"
        >
          <form onSubmit={handleSubmitReview} className="space-y-4 pt-2">
            <p className="text-sm text-surface-500 dark:text-surface-400">
              {reviewDialog.status === 'approved' 
                ? 'This will share your contact details with the claimant so you can talk and verify the item. The item will be placed in the "Handover" stage but will NOT be closed yet.' 
                : 'Reject this claim. This will notify the claimant that the claim has been declined. The item will remain available.'
              }
            </p>

            <Textarea 
              label="Remark / Message to Claimant"
              placeholder={reviewDialog.status === 'approved' 
                ? 'Optional: Specify instructions or a preferred time to meet and hand over the item.' 
                : 'Specify reason for rejection (e.g., "Provided details do not match the found item characteristics.")'
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
                Cancel
              </Button>
              <Button 
                variant={reviewDialog.status === 'approved' ? 'success' : 'danger'}
                type="submit"
                loading={isSubmitting}
              >
                {reviewDialog.status === 'approved' ? 'Connect & Verify' : 'Reject'}
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
          defaultSubject={`Feedback on my claim for "${feedbackDialog.foundItemId?.itemName || feedbackDialog.lostItemId?.itemName || 'Item'}"`}
        />
      )}

    </div>
  );
};

export default MyClaims;

