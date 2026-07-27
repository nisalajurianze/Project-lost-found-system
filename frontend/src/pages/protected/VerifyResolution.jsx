import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FiCheckCircle, FiLoader, FiXCircle } from 'react-icons/fi';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import Textarea from '../../components/common/Textarea';
import { useLanguage } from '../../i18n/LanguageContext';
import { fetchFoundItemById } from '../../redux/slices/foundItemSlice';
import { fetchLostItemById } from '../../redux/slices/lostItemSlice';
import foundItemService from '../../services/foundItemService';
import lostItemService from '../../services/lostItemService';

const VerifyResolution = () => {
  const { type, id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [item, setItem] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    const fetchItem = async () => {
      try {
        if (!['found', 'lost'].includes(type)) {
          toast.error(t('resolution.invalidType'));
          navigate('/dashboard', { replace: true });
          return;
        }
        const action = type === 'found' ? fetchFoundItemById(id) : fetchLostItemById(id);
        const response = await dispatch(action).unwrap();
        setItem(response);
      } catch {
        toast.error(t('resolution.loadFailed'));
        navigate('/dashboard', { replace: true });
      } finally {
        setLoading(false);
      }
    };
    fetchItem();
  }, [dispatch, id, navigate, t, type]);

  const handleResolve = async () => {
    setIsProcessing(true);
    try {
      if (type === 'found') await foundItemService.resolveFoundItem(id);
      else await lostItemService.resolveLostItem(id);
      toast.success(t('resolution.resolveSuccess'));
      navigate('/dashboard');
    } catch {
      toast.error(t('resolution.resolveError'));
      setIsProcessing(false);
    }
  };

  const handleCancel = async (event) => {
    event.preventDefault();
    const reason = cancelReason.trim();
    if (reason.length < 5) {
      setCancelError(t('resolution.cancelReasonRequired'));
      return;
    }
    setCancelError('');
    setIsProcessing(true);
    try {
      if (type === 'found') await foundItemService.cancelConnection(id, reason);
      else await lostItemService.cancelConnection(id, reason);
      toast.success(t('resolution.cancelSuccess'));
      navigate('/dashboard');
    } catch {
      toast.error(t('resolution.cancelError'));
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center" role="status" aria-label={t('resolution.loading')}>
        <FiLoader aria-hidden="true" className="h-8 w-8 animate-spin text-primary-500" />
        <span className="sr-only">{t('resolution.loading')}</span>
      </div>
    );
  }

  if (!item) return null;

  const StateCard = ({ icon, title, description }) => (
    <div className="mx-auto max-w-2xl px-4 py-12 text-center">
      <div className="rounded-3xl border border-surface-200 bg-white p-8 shadow-xl dark:border-surface-700 dark:bg-surface-800">
        {icon}
        <h1 className="mb-2 text-2xl font-bold text-surface-900 dark:text-white">{title}</h1>
        <p className="mb-6 text-surface-600 dark:text-surface-400">{description}</p>
        <Button type="button" onClick={() => navigate('/dashboard')}>{t('resolution.dashboard')}</Button>
      </div>
    </div>
  );

  if (item.status === 'claimed') {
    return <StateCard icon={<FiCheckCircle aria-hidden="true" className="mx-auto mb-6 h-20 w-20 text-green-500" />} title={t('resolution.alreadyTitle')} description={t('resolution.alreadyDesc')} />;
  }

  if (item.status !== 'in_progress') {
    return <StateCard icon={<FiXCircle aria-hidden="true" className="mx-auto mb-6 h-20 w-20 text-amber-500" />} title={t('resolution.invalidStateTitle')} description={t('resolution.invalidStateDesc')} />;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <section className="rounded-3xl border border-surface-200 bg-white p-8 text-center shadow-xl dark:border-surface-700 dark:bg-surface-800 sm:p-12">
        <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full bg-primary-50 text-primary-500 dark:bg-primary-900/20">
          <FiCheckCircle aria-hidden="true" className="h-10 w-10" />
        </div>
        <h1 className="mb-4 font-display text-3xl font-black tracking-tight text-surface-900 dark:text-white">{t('resolution.title')}</h1>
        <p className="mb-5 text-lg text-surface-600 dark:text-surface-300">
          {t('resolution.prompt', { type: t(`resolution.type.${type}`), item: item.itemName })}
        </p>
        <p className="mb-8 rounded-xl border border-sky-200 bg-sky-50 p-3 text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-100">{t('resolution.notice')}</p>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button type="button" onClick={handleResolve} disabled={isProcessing} className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-green-500 bg-green-50 p-6 text-green-700 transition-colors hover:bg-green-100 focus:outline-none focus:ring-4 focus:ring-green-500/20 disabled:cursor-wait disabled:opacity-60 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40">
            <FiCheckCircle aria-hidden="true" className="h-8 w-8" />
            <span className="font-bold">{t('resolution.yes')}</span>
          </button>
          <button type="button" onClick={() => { setShowCancelDialog(true); setCancelError(''); }} disabled={isProcessing} className="flex min-h-28 flex-col items-center justify-center gap-3 rounded-2xl border-2 border-red-500 bg-red-50 p-6 text-red-700 transition-colors hover:bg-red-100 focus:outline-none focus:ring-4 focus:ring-red-500/20 disabled:cursor-wait disabled:opacity-60 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40">
            <FiXCircle aria-hidden="true" className="h-8 w-8" />
            <span className="font-bold">{t('resolution.no')}</span>
          </button>
        </div>
        {isProcessing && <p className="mt-6 text-sm text-surface-500" role="status">{t('resolution.processing')}</p>}
      </section>

      <Modal isOpen={showCancelDialog} onClose={() => !isProcessing && setShowCancelDialog(false)} title={t('resolution.cancelTitle')} size="md">
        <form onSubmit={handleCancel} className="space-y-4 pt-2">
          <p className="text-sm text-surface-600 dark:text-surface-300">{t('resolution.cancelDesc')}</p>
          <Textarea name="cancelReason" label={t('resolution.cancelReason')} value={cancelReason} onChange={(event) => { setCancelReason(event.target.value); setCancelError(''); }} placeholder={t('resolution.cancelReasonPlaceholder')} rows={4} maxLength={1000} required error={cancelError} />
          <div className="flex flex-col-reverse gap-3 border-t border-surface-100 pt-4 dark:border-surface-700 sm:flex-row sm:justify-end">
            <Button type="button" variant="secondary" onClick={() => setShowCancelDialog(false)} disabled={isProcessing}>{t('resolution.keepConnection')}</Button>
            <Button type="submit" variant="danger" loading={isProcessing}>{t('resolution.confirmCancel')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default VerifyResolution;
