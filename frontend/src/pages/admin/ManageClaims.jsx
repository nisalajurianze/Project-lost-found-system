import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
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

const ManageClaims = () => {
  const dispatch = useDispatch();
  const { claims, pagination, isLoading, error } = useSelector((state) => state.claims);

  // Filter & Search states
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Review Dialog state
  const [reviewDialog, setReviewDialog] = useState(null); // { id, status }
  const [remark, setRemark] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchClaims({ status, page, limit: 9 }));
  }, [dispatch, status, page]);

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

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

      toast.success(`Claim request successfully ${reviewDialog.status}.`);
      handleCloseReview();
      // Reload current page
      dispatch(fetchClaims({ status, page, limit: 9 }));
    } catch (err) {
      toast.error(err || 'Failed to submit claim review.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' }
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          Ownership Claims
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Verify matching proofs and descriptions. Approve valid ownership handbacks or reject invalid claims.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4">
        <div className="w-full md:w-64">
          <Select 
            label="Filter by Status"
            value={status}
            onChange={handleStatusChange}
            options={statusOptions}
            placeholder="All Statuses"
          />
        </div>
      </div>

      {/* Claims List */}
      {isLoading ? (
        <Loader />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm">
          Failed to load claims: {error}
        </div>
      ) : claims.length === 0 ? (
        <EmptyState 
          title="No Claims Found" 
          message="There are no claims submitted matching this filter." 
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
          title={reviewDialog.status === 'approved' ? 'Approve Claim Request' : 'Reject Claim Request'}
          size="md"
        >
          <form onSubmit={handleSubmitReview} className="space-y-4 pt-2">
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {reviewDialog.status === 'approved' 
                ? 'Approve this claim. This will mark the found listing as claimed, update the claimant, and notify both parties.' 
                : 'Reject this claim. This will notify the claimant that the claim has been declined. The item will remain available.'
              }
            </p>

            <Textarea 
              label="Admin Remark / Message to Claimant"
              placeholder={reviewDialog.status === 'approved' 
                ? 'Specify instructions for collecting the item (e.g., "Please collect your item at the security office main gate during office hours.")' 
                : 'Specify reason for rejection (e.g., "Provided details do not match the found item characteristics.")'
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
                Cancel
              </Button>
              <Button 
                variant={reviewDialog.status === 'approved' ? 'success' : 'danger'}
                type="submit"
                loading={isSubmitting}
              >
                {reviewDialog.status === 'approved' ? 'Approve' : 'Reject'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ManageClaims;
