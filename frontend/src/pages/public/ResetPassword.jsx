// ============================================
// Reset Password Page Component
// Validates token links and saves new passwords
// ============================================

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../services/authService';
import { validatePassword } from '../../utils/validators';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';
import { FiCheckCircle } from 'react-icons/fi';

export const ResetPassword = () => {
  const { t } = useLanguage();
  const token = new URLSearchParams(window.location.hash.replace(/^#/, '')).get('token');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) setError(t('auth.resetMissingUrl'));
  }, [token, t]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!token) return setError(t('auth.resetMissingToken'));
    if (!password) return setError(t('auth.passwordRequired'));
    if (!validatePassword(password)) return setError(t('auth.passwordPolicy'));
    if (password !== confirmPassword) return setError(t('auth.passwordMismatch'));

    setIsLoading(true);
    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
      toast.success(t('auth.resetSuccessToast'));
    } catch (err) {
      setError(err?.message || t('auth.resetFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface-100 dark:bg-surface-950 transition-colors duration-300">
        <div className="max-w-md w-full glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl text-center flex flex-col items-center">
          <FiCheckCircle className="text-6xl text-emerald-500 mb-4 animate-scale-in" aria-hidden="true" />
          <h1 className="text-xl font-bold font-display text-surface-900 dark:text-white mb-2">{t('auth.passwordChanged')}</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-6 leading-relaxed">{t('auth.passwordChangedDesc')}</p>
          <Link to="/login" className="btn btn-primary w-full rounded-lg">{t('auth.loginNow')}</Link>
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
          <h1 className="text-xl font-bold font-display text-surface-900 dark:text-white mt-4">{t('auth.createNewPassword')}</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">{t('auth.createNewPasswordDesc')}</p>
        </div>

        {error && <div role="alert" className="p-3 bg-red-50 border border-red-200 text-sm text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-lg mb-6">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label={t('auth.newPassword')}
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={!token}
            showPasswordLabel={t('profile.showPassword')}
            hidePasswordLabel={t('profile.hidePassword')}
            required
          />
          <Input
            label={t('auth.confirmNewPassword')}
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            disabled={!token}
            showPasswordLabel={t('profile.showPassword')}
            hidePasswordLabel={t('profile.hidePassword')}
            required
          />
          <Button type="submit" variant="primary" className="w-full mt-6" isLoading={isLoading} disabled={!token}>
            {t('auth.resetPassword')}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
