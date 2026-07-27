// ============================================
// Registration Page Component
// Input validations, email verification guidance, and profile-picture prompt
// ============================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { GoogleLogin } from '@react-oauth/google';
import { registerUser, googleLoginUser, clearAuthError } from '../../redux/slices/authSlice';
import { validateEmail, validatePassword, validatePhone, validateStudentId } from '../../utils/validators';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import { useLanguage } from '../../i18n/LanguageContext';
import toast from 'react-hot-toast';
import { FiCheckCircle } from 'react-icons/fi';

export const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t } = useLanguage();
  const { isAuthenticated, isLoading, error } = useSelector((state) => state.auth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  useEffect(() => {
    if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, navigate]);

  useEffect(() => () => dispatch(clearAuthError()), [dispatch]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = {};

    if (!fullName.trim()) errors.fullName = t('auth.fullNameRequired');
    if (!email) errors.email = t('auth.emailRequired');
    else if (!validateEmail(email)) errors.email = t('auth.invalidEmail');
    if (!phone) errors.phone = t('auth.phoneRequired');
    else if (!validatePhone(phone)) errors.phone = t('auth.phoneInvalid');
    if (!studentId) errors.studentId = t('auth.studentIdRequired');
    else if (!validateStudentId(studentId)) errors.studentId = t('auth.studentIdInvalid');
    if (!password) errors.password = t('auth.passwordRequired');
    else if (!validatePassword(password)) errors.password = t('auth.passwordPolicy');
    if (confirmPassword !== password) errors.confirmPassword = t('auth.passwordMismatch');

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      const response = await dispatch(registerUser({
        fullName: fullName.trim(),
        email,
        phone,
        studentId,
        password,
        confirmPassword,
      })).unwrap();

      if (!response?.user?.isVerified) {
        setRegistrationSuccess(true);
        toast.success(t('auth.registrationVerify'));
        return;
      }

      toast.success(t('auth.registrationWelcome'));
      toast.custom((toastInstance) => (
        <div className={`${toastInstance.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-surface-800 shadow-2xl rounded-2xl pointer-events-auto flex flex-col ring-1 ring-black/5 overflow-hidden`}>
          <div className="p-5 flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center" aria-hidden="true">
                <span className="text-xl">📸</span>
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-bold text-surface-900 dark:text-white">{t('auth.profilePromptTitle')} 🎉</p>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">{t('auth.profilePromptDesc')}</p>
            </div>
          </div>
          <div className="bg-surface-50 dark:bg-surface-800/50 px-4 py-3 flex justify-end gap-2 border-t border-surface-100 dark:border-surface-700">
            <button type="button" onClick={() => toast.dismiss(toastInstance.id)} className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl transition-colors">
              {t('auth.maybeLater')}
            </button>
            <button type="button" onClick={() => { toast.dismiss(toastInstance.id); navigate('/dashboard/profile'); }} className="px-4 py-2 text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl shadow-md transition-colors">
              {t('auth.uploadPicture')}
            </button>
          </div>
        </div>
      ), { duration: 10000, position: 'bottom-right' });

      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error(t('auth.registrationFailed'));
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await dispatch(googleLoginUser(credentialResponse.credential)).unwrap();
      toast.success(t('auth.googleRegisterSuccess'));
    } catch (err) {
      toast.error(t('auth.googleRegisterFailed'));
    }
  };

  if (registrationSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface-100 dark:bg-surface-950 transition-colors duration-300">
        <div className="max-w-md w-full glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl text-center flex flex-col items-center">
          <FiCheckCircle className="text-6xl text-emerald-500 mb-4 animate-scale-in" aria-hidden="true" />
          <h1 className="text-xl font-bold font-display text-surface-900 dark:text-white mb-2">{t('auth.verificationEmailSent')}</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-6 leading-relaxed">{t('auth.verificationEmailDesc', { email })}</p>
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
          <h1 className="text-xl font-bold font-display text-surface-900 dark:text-white mt-4">{t('auth.registerTitle')}</h1>
          <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">{t('auth.registerSubtitle')}</p>
        </div>

        {error && <div role="alert" className="p-3 bg-red-50 border border-red-200 text-sm text-red-600 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-lg mb-6">⚠️ {error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <Input label={t('auth.fullName')} name="fullName" autoComplete="name" placeholder={t('auth.fullNamePlaceholder')} value={fullName} onChange={(event) => setFullName(event.target.value)} error={fieldErrors.fullName} required />
          <Input label={t('auth.email')} name="email" type="email" autoComplete="email" placeholder={t('auth.emailPlaceholder')} value={email} onChange={(event) => setEmail(event.target.value)} error={fieldErrors.email} required />
          <Input label={t('auth.phone')} name="phone" type="tel" autoComplete="tel" placeholder={t('auth.phonePlaceholder')} value={phone} onChange={(event) => setPhone(event.target.value)} error={fieldErrors.phone} helperText={t('auth.phoneHelper')} required />
          <Input label={t('auth.studentId')} name="studentId" autoComplete="off" placeholder={t('auth.studentIdPlaceholder')} value={studentId} onChange={(event) => setStudentId(event.target.value)} error={fieldErrors.studentId} required />
          <Input label={t('auth.password')} name="password" type="password" autoComplete="new-password" placeholder="••••••••" value={password} onChange={(event) => setPassword(event.target.value)} error={fieldErrors.password} helperText={t('auth.passwordPolicy')} showPasswordLabel={t('profile.showPassword')} hidePasswordLabel={t('profile.hidePassword')} required />
          <Input label={t('auth.confirmPassword')} name="confirmPassword" type="password" autoComplete="new-password" placeholder="••••••••" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} error={fieldErrors.confirmPassword} showPasswordLabel={t('profile.showPassword')} hidePasswordLabel={t('profile.hidePassword')} required />
          <Button type="submit" variant="primary" className="w-full mt-6" isLoading={isLoading}>{t('auth.signUp')}</Button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-2" aria-label={t('auth.or')}>
          <span className="h-px w-full bg-surface-200 dark:bg-surface-800" />
          <span className="text-sm text-surface-500 uppercase tracking-widest font-semibold">{t('auth.or')}</span>
          <span className="h-px w-full bg-surface-200 dark:bg-surface-800" />
        </div>

        <div className="mt-6 flex justify-center w-full">
          {String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim() && (
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={() => toast.error(t('auth.googleSignInFailed'))} theme="outline" size="large" text="signup_with" shape="rectangular" />
          )}
        </div>

        <div className="text-center mt-6 pt-6 border-t border-surface-100 dark:border-surface-800 text-sm text-surface-500 dark:text-surface-400">
          {t('auth.alreadyAccount')}{' '}
          <Link to="/login" className="font-bold text-primary-500 hover:text-primary-600 dark:text-primary-400">{t('common.login')}</Link>
        </div>
      </div>
    </div>
  );
};

export default Register;
