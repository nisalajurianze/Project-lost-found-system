// ============================================
// Forgot Password Page Component
// Requests reset links via email without disclosing account existence
// ============================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../services/authService';
import { validateEmail } from '../../utils/validators';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';
import { FiMail } from 'react-icons/fi';

export const ForgotPassword = () => {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!email) return setError(t('auth.resetEmailRequired'));
    if (!validateEmail(email)) return setError(t('auth.resetInvalidEmail'));

    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      setRequestSent(true);
      toast.success(t('auth.resetLinkSentToast'));
    } catch (err) {
      setError(err?.message || t('auth.resetRequestFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  if (requestSent) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface-100 dark:bg-surface-950 transition-colors duration-300">
        <div className="max-w-md w-full glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl text-center flex flex-col items-center">
          <FiMail className="text-6xl text-primary-500 mb-4 animate-scale-in" aria-hidden="true" />
          <h1 className="text-xl font-bold font-display text-surface-900 dark:text-white mb-2">{t('auth.resetDispatched')}</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-6 leading-relaxed">
            {t('auth.resetSentDesc', { email })}
          </p>
          <Link to="/login" className="btn btn-primary w-full rounded-lg">{t('auth.backToLogin')}</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface-100 dark:bg-surface-950 transition-colors duration-300">
      <div className="max-w-md w-full glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center gap-1.5 text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-primary-500 to-primary-300 bg-clip-text text-transparent">
            <img src="/logo.png" alt={t('auth.logoAlt')} className="h-8 w-8 object-contain translate-y-0.5" />
            Smart L&F
          </Link>
          <h1 className="text-xl font-bold font-display text-surface-900 dark:text-white mt-4">{t('auth.resetTitle')}</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">{t('auth.resetSubtitle')}</p>
        </div>

        {error && <div role="alert" className="p-3 bg-red-50 border border-red-200 text-sm text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-lg mb-6">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label={t('auth.email')}
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
          <Button type="submit" variant="primary" className="w-full mt-4" isLoading={isLoading}>
            {t('auth.sendResetLink')}
          </Button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-surface-100 dark:border-surface-800 text-sm text-surface-500 dark:text-surface-400">
          {t('auth.rememberedPassword')}{' '}
          <Link to="/login" className="font-bold text-primary-500 hover:text-primary-600 dark:text-primary-400">{t('common.login')}</Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
