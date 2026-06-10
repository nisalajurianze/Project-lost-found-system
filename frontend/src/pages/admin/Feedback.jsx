import React, { useEffect, useState } from 'react';
import { MessageSquare, Star, Reply, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../services/api';
import Button from '../../components/common/Button';
import Select from '../../components/common/Select';
import Textarea from '../../components/common/Textarea';
import Pagination from '../../components/common/Pagination';
import Loader from '../../components/common/Loader';
import EmptyState from '../../components/common/EmptyState';
import Modal from '../../components/common/Modal';
import { formatAbsoluteDate as formatDate } from '../../utils/formatDate';
import { getInitials } from '../../utils/helpers';

const Feedback = () => {
  const [feedbacks, setFeedbacks] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 1, totalDocs: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [category, setCategory] = useState('');
  const [rating, setRating] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Response Modal State
  const [responseItem, setResponseItem] = useState(null); // feedback object
  const [adminResponse, setAdminResponse] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchFeedbackData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/feedback', {
        params: { category, rating, status, page, limit: 10 }
      });
      setFeedbacks(res.data.data.feedbacks);
      setPagination(res.data.data.pagination);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch feedback listings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedbackData();
  }, [category, rating, status, page]);

  const handleCategoryChange = (e) => {
    setCategory(e.target.value);
    setPage(1);
  };

  const handleRatingChange = (e) => {
    setRating(e.target.value);
    setPage(1);
  };

  const handleStatusChange = (e) => {
    setStatus(e.target.value);
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleOpenResponse = (item) => {
    setResponseItem(item);
    setAdminResponse(item.adminResponse || '');
  };

  const handleCloseResponse = () => {
    setResponseItem(null);
    setAdminResponse('');
  };

  const handleSubmitResponse = async (e) => {
    e.preventDefault();
    if (!responseItem) return;

    setIsSubmitting(true);
    try {
      await api.put(`/feedback/${responseItem._id}`, {
        adminResponse,
        status: 'reviewed'
      });
      toast.success('Response submitted successfully.');
      handleCloseResponse();
      fetchFeedbackData(); // Reload list
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit response.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryOptions = [
    { value: 'general', label: 'General System' },
    { value: 'lost', label: 'Lost Items reporting' },
    { value: 'found', label: 'Found listings' },
    { value: 'matching', label: 'AI Match Suggestions' },
    { value: 'other', label: 'Other issues' }
  ];

  const ratingOptions = [
    { value: '5', label: '5 Stars' },
    { value: '4', label: '4 Stars' },
    { value: '3', label: '3 Stars' },
    { value: '2', label: '2 Stars' },
    { value: '1', label: '1 Star' }
  ];

  const statusOptions = [
    { value: 'pending', label: 'Pending Review' },
    { value: 'reviewed', label: 'Reviewed' }
  ];

  // Render Star Icons helper
  const renderStars = (count) => {
    return (
      <div className="flex text-amber-400">
        {[...Array(5)].map((_, i) => (
          <Star 
            key={i} 
            className={`h-4 w-4 ${i < count ? 'fill-current' : 'text-slate-200 dark:text-slate-700'}`} 
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <MessageSquare className="h-8 w-8 text-indigo-600 dark:text-indigo-400" />
          Feedback & Reviews
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Monitor user ratings, suggestions, and send official administrative replies to comments.
        </p>
      </div>

      {/* Filter Bar */}
      <div className="card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select 
            label="Category"
            value={category}
            onChange={handleCategoryChange}
            options={categoryOptions}
            placeholder="All Categories"
          />
          <Select 
            label="Rating"
            value={rating}
            onChange={handleRatingChange}
            options={ratingOptions}
            placeholder="All Ratings"
          />
          <Select 
            label="Review Status"
            value={status}
            onChange={handleStatusChange}
            options={statusOptions}
            placeholder="All Statuses"
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <Loader />
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-xl text-sm">
          Failed to load feedback: {error}
        </div>
      ) : feedbacks.length === 0 ? (
        <EmptyState 
          title="No Feedback Found" 
          message="No user feedback lists match your selected search criteria." 
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            {feedbacks.map((item) => (
              <div 
                key={item._id} 
                className="card bg-white dark:bg-slate-900/60 dark:backdrop-blur-md border border-slate-200 dark:border-slate-800 p-5 space-y-4"
              >
                {/* Header */}
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold overflow-hidden border border-slate-200 dark:border-slate-700">
                      {item.userId?.profileImage?.url ? (
                        <img src={item.userId.profileImage.url} alt={item.userId.fullName} className="h-full w-full object-cover" />
                      ) : (
                        getInitials(item.userId?.fullName || 'Guest User')
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {item.userId?.fullName || 'Guest User'}
                      </p>
                      <p className="text-xs text-slate-400 font-mono">
                        {item.userId?.studentId || 'GUEST'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5">
                    {renderStars(item.rating)}
                    <span className="text-[10px] text-slate-400">
                      {formatDate(item.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-100/30">
                    {item.category}
                  </span>
                  <h3 className="font-semibold text-slate-950 dark:text-white pt-1">
                    {item.subject}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed pt-1">
                    {item.message}
                  </p>
                </div>

                {/* Admin Response section */}
                {item.adminResponse ? (
                  <div className="p-3.5 rounded-lg bg-indigo-50/20 dark:bg-indigo-950/10 border border-indigo-100/30 dark:border-indigo-900/30 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-700 dark:text-indigo-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Administrative Response</span>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed italic">
                      "{item.adminResponse}"
                    </p>
                    <div className="flex justify-end pt-1">
                      <button 
                        onClick={() => handleOpenResponse(item)}
                        className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        <Reply className="h-3 w-3" /> Edit Response
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button 
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenResponse(item)}
                      className="flex items-center gap-1"
                    >
                      <Reply className="h-4 w-4" /> Write Response
                    </Button>
                  </div>
                )}
              </div>
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

      {/* Response Modal */}
      {responseItem && (
        <Modal
          isOpen={!!responseItem}
          onClose={handleCloseResponse}
          title="Respond to Feedback"
          size="md"
        >
          <form onSubmit={handleSubmitResponse} className="space-y-4 pt-2">
            <div className="space-y-1 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs">
              <p className="font-semibold text-slate-900 dark:text-white">Subject: {responseItem.subject}</p>
              <p className="text-slate-500 mt-1">"{responseItem.message}"</p>
            </div>

            <Textarea 
              label="Admin Official Response"
              placeholder="Write your response to the user's feedback here..."
              value={adminResponse}
              onChange={(e) => setAdminResponse(e.target.value)}
              required
              rows={4}
            />

            <div className="flex gap-2 justify-end border-t border-slate-100 dark:border-slate-800 pt-4 mt-6">
              <Button 
                variant="secondary" 
                onClick={handleCloseResponse}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button 
                variant="primary"
                type="submit"
                loading={isSubmitting}
              >
                Submit Response
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default Feedback;
