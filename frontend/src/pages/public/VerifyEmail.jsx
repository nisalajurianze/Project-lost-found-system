// ============================================
// Email Verification Page Component
// Calls the backend to confirm account registration
// ============================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../services/authService';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';

export const VerifyEmail = () => {
  const { t } = useLanguage();
  const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token');
  const [status, setStatus] = useState('loading');
  const [message, setMessage] = useState(t('auth.verifyingMessage'));

  useEffect(() => {
    let active = true;

    const performVerification = async () => {
      if (!token) {
        if (active) {
          setStatus('error');
          setMessage(t('auth.verificationMissing'));
        }
        return;
      }

      try {
        const response = await authService.verifyEmail(token);
        if (!active) return;
        setStatus('success');
        setMessage(response?.message || t('auth.verifiedSuccess'));
        toast.success(t('auth.verifiedToast'));
      } catch (error) {
        if (!active) return;
        setStatus('error');
        setMessage(error?.message || t('auth.verificationExpired'));
        toast.error(t('auth.verificationFailedToast'));
      }
    };

    performVerification();
    return () => { active = false; };
  }, [token, t]);

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface-50 dark:bg-surface-950 transition-colors duration-300">
      <div className="max-w-md w-full glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl text-center flex flex-col items-center">
        <Link to="/" className="inline-flex items-center justify-center gap-1.5 text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-primary-500 to-primary-300 bg-clip-text text-transparent">
          <img src="/logo.png" alt={t('auth.logoAlt')} className="h-8 w-8 object-contain translate-y-0.5" />
          Smart L&F
        </Link>

        {status === 'loading' && (
          <div className="flex flex-col items-center my-6" role="status" aria-live="polite">
            <FiLoader className="text-5xl text-primary-500 animate-spin mb-4" aria-hidden="true" />
            <h1 className="text-xl font-bold font-display text-surface-900 dark:text-white mb-2">{t('auth.verifyingTitle')}</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center my-6 animate-scale-in" role="status">
            <FiCheckCircle className="text-6xl text-emerald-500 mb-4" aria-hidden="true" />
            <h1 className="text-xl font-bold font-display text-surface-900 dark:text-white mb-2">{t('auth.accountVerified')}</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-8 leading-relaxed">{message}</p>
            <Link to="/login" className="btn btn-primary w-full rounded-lg py-2.5">{t('auth.goToLogin')}</Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center my-6 animate-scale-in" role="alert">
            <FiXCircle className="text-6xl text-red-500 mb-4" aria-hidden="true" />
            <h1 className="text-xl font-bold font-display text-surface-900 dark:text-white mb-2">{t('auth.verificationFailed')}</h1>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-8 leading-relaxed">{message}</p>
            <div className="flex flex-col gap-3 w-full">
              <Link to="/login" className="btn btn-secondary w-full rounded-lg py-2">{t('auth.backToLogin')}</Link>
              <Link to="/register" className="btn btn-primary w-full rounded-lg py-2">{t('auth.registerAgain')}</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;
