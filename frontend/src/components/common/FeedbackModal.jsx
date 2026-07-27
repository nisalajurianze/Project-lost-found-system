import React, { useEffect, useState } from 'react';
import { FiStar } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { useLanguage } from '../../i18n/LanguageContext';
import feedbackService from '../../services/feedbackService';
import Button from './Button';
import Input from './Input';
import Modal from './Modal';
import Textarea from './Textarea';

const FeedbackModal = ({ isOpen, onClose, defaultSubject = '' }) => {
  const { t } = useLanguage();
  const [rating, setRating] = useState(5);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    if (isOpen) setSubject(defaultSubject);
  }, [defaultSubject, isOpen]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (message.trim().length < 10) {
      toast.error(t('feedbackModal.messageMin'));
      return;
    }

    setIsLoading(true);
    try {
      await feedbackService.createFeedback({ subject: subject.trim(), message: message.trim(), rating, category: 'praise' });
      toast.success(t('feedbackModal.success'));
      setRating(5);
      setSubject(defaultSubject);
      setMessage('');
      onClose();
    } catch {
      toast.error(t('feedbackModal.error'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('feedbackModal.title')} size="md">
      <form onSubmit={handleSubmit} className="space-y-5 pt-2">
        <p className="text-sm text-surface-500 dark:text-surface-400">{t('feedbackModal.description')}</p>
        <fieldset className="my-4 flex flex-col items-center gap-2">
          <legend className="text-sm font-semibold text-surface-700 dark:text-surface-300">{t('feedbackModal.rating')}</legend>
          <div className="flex gap-1" role="radiogroup" aria-label={t('feedbackModal.rating')}>
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} type="button" role="radio" aria-checked={rating === star} aria-label={t('feedbackModal.starLabel', { count: star })} className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-3xl transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500" onMouseEnter={() => setHoverRating(star)} onMouseLeave={() => setHoverRating(0)} onFocus={() => setHoverRating(star)} onBlur={() => setHoverRating(0)} onClick={() => setRating(star)}>
                <FiStar aria-hidden="true" className={(hoverRating || rating) >= star ? 'fill-yellow-400 text-yellow-400' : 'text-surface-300 dark:text-surface-600'} />
              </button>
            ))}
          </div>
        </fieldset>
        <Input name="feedbackSubject" label={t('feedbackModal.subject')} value={subject} onChange={(event) => setSubject(event.target.value)} placeholder={t('feedbackModal.subjectPlaceholder')} maxLength={200} required />
        <Textarea name="feedbackMessage" label={t('feedbackModal.message')} value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('feedbackModal.messagePlaceholder')} maxLength={2000} required rows={4} />
        <div className="flex justify-end gap-3 border-t border-surface-100 pt-4 dark:border-surface-800">
          <Button variant="secondary" onClick={onClose} disabled={isLoading} type="button">{t('feedbackModal.cancel')}</Button>
          <Button variant="primary" type="submit" loading={isLoading}>{t('feedbackModal.submit')}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default FeedbackModal;
