import React, { useState } from 'react';
import Modal from './Modal';
import Button from './Button';
import Input from './Input';
import Textarea from './Textarea';
import { FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import feedbackService from '../../services/feedbackService';

const FeedbackModal = ({ isOpen, onClose, defaultSubject = '' }) => {
  const [rating, setRating] = useState(5);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message || message.length < 10) {
      toast.error('Message must be at least 10 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      await feedbackService.createFeedback({
        subject,
        message,
        rating,
        category: 'praise' // Since this is mostly post-resolution, 'praise' or 'general' is appropriate
      });
      toast.success('Thank you for your feedback!');
      onClose();
      // Reset form
      setRating(5);
      setSubject(defaultSubject);
      setMessage('');
    } catch (err) {
      toast.error(err?.response?.data?.message || err.message || 'Failed to submit feedback.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Leave Feedback" size="md">
      <form onSubmit={handleSubmit} className="space-y-5 pt-2">
        <p className="text-sm text-surface-500 dark:text-surface-400">
          We are glad your item was resolved! Please let us know about your experience using the platform.
        </p>

        {/* Star Rating */}
        <div className="flex flex-col items-center gap-2 my-4">
          <span className="text-sm font-semibold text-surface-700 dark:text-surface-300">
            Rate your experience
          </span>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="text-3xl focus:outline-none transition-colors"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <FiStar
                  className={(hoverRating || rating) >= star 
                    ? 'fill-yellow-400 text-yellow-400' 
                    : 'text-surface-300 dark:text-surface-600'}
                />
              </button>
            ))}
          </div>
        </div>

        <Input
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="e.g. Great experience finding my lost phone!"
          required
        />

        <Textarea
          label="Your Feedback"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what you liked or how we can improve..."
          required
          rows={4}
        />

        <div className="flex justify-end gap-3 pt-4 border-t border-surface-100 dark:border-surface-800">
          <Button variant="secondary" onClick={onClose} disabled={isLoading} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isLoading}>
            Submit Feedback
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default FeedbackModal;
