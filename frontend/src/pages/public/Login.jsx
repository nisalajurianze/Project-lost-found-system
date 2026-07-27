// ============================================
// Login Page Component
// Input validations, cookie-oriented session handling, and error indicators
// ============================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { GoogleLogin } from '@react-oauth/google';
import { loginUser, googleLoginUser, clearAuthError } from '../../redux/slices/authSlice';
import { validateEmail } from '../../utils/validators';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { t } = useLanguage();

  const { isAuthenticated, isLoading, error } = useSelector((state) => state.auth);

  const [email, setEmail] = useState(localStorage.getItem('rememberedEmail') || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(!!localStorage.getItem('rememberedEmail'));
  const [fieldErrors, setFieldErrors] = useState({});

  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true });
  }, [isAuthenticated, navigate, from]);

  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = {};

    if (!email) errors.email = t('auth.emailRequired');
    else if (!validateEmail(email)) errors.email = t('auth.invalidEmail');
    if (!password) errors.password = t('auth.passwordRequired');

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      if (rememberMe) localStorage.setItem('rememberedEmail', email);
      else localStorage.removeItem('rememberedEmail');

      await dispatch(loginUser({ email, password, rememberMe })).unwrap();
      toast.success(t('auth.welcomeBack'));
    } catch (err) {
      toast.error(t('auth.authFailed'));
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await dispatch(googleLoginUser(credentialResponse.credential)).unwrap();
      toast.success(t('auth.welcomeBack'));
    } catch (err) {
      toast.error(t('auth.googleLoginFailed'));
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface-100 dark:bg-surface-950 transition-colors duration-300">
      <div className="max-w-md w-full glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center justify-center gap-1.5 text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-primary-500 to-primary-300 bg-clip-text text-transparent">
            <img src="/logo.png" alt={t('auth.logoAlt')} className="h-8 w-8 object-contain translate-y-0.5" />
            Smart L&F
          </Link>
          <h1 className="text-xl font-bold font-display text-surface-900 dark:text-white mt-4">
            {t('auth.loginTitle')}
          </h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {error && (
          <div role="alert" className="p-3 bg-red-50 border border-red-200 text-sm text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-lg mb-6">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input
            label={t('auth.email')}
            name="email"
            type="email"
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            error={fieldErrors.email}
            required
          />

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="password" className="input-label mb-0">
                {t('auth.password')}
              </label>
              <Link to="/forgot-password" className="text-sm font-semibold text-primary-500 hover:text-primary-600 dark:text-primary-400">
                {t('auth.forgotPassword')}
              </Link>
            </div>
            <Input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              error={fieldErrors.password}
              showPasswordLabel={t('profile.showPassword')}
              hidePasswordLabel={t('profile.hidePassword')}
              required
            />
          </div>

          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
              className="h-4 w-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500 dark:border-surface-600 dark:bg-surface-800 dark:ring-offset-surface-900 cursor-pointer"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-surface-700 dark:text-surface-300 cursor-pointer select-none">
              {t('auth.rememberMe')}
            </label>
          </div>

          <Button type="submit" variant="primary" className="w-full mt-4" isLoading={isLoading}>
            {t('auth.signIn')}
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-2" aria-label={t('auth.or')}>
          <span className="h-px w-full bg-surface-200 dark:bg-surface-800" />
          <span className="text-sm text-surface-500 uppercase tracking-widest font-semibold">{t('auth.or')}</span>
          <span className="h-px w-full bg-surface-200 dark:bg-surface-800" />
        </div>

        <div className="mt-6 flex justify-center w-full">
          {String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim() && (
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error(t('auth.googleSignInFailed'))}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
            />
          )}
        </div>

        <div className="text-center mt-6 pt-6 border-t border-surface-100 dark:border-surface-800 text-sm text-surface-500 dark:text-surface-400">
          {t('auth.newPlatform')}{' '}
          <Link to="/register" className="font-bold text-primary-500 hover:text-primary-600 dark:text-primary-400">
            {t('auth.createAccount')}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
