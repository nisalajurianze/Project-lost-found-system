// ============================================
// Email Verification Page Component
// Calls the backend to confirm account registration
// ============================================

import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import authService from '../../services/authService';
import { FiCheckCircle, FiXCircle, FiLoader } from 'react-icons/fi';
import toast from 'react-hot-toast';

export const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState('loading'); // 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('Verifying your email address, please wait...');

  useEffect(() => {
    const performVerification = async () => {
      if (!token) {
        setStatus('error');
        setMessage('Verification token is missing in the URL link.');
        return;
      }

      try {
        const response = await authService.verifyEmail(token);
        setStatus('success');
        setMessage(response?.message || 'Your email address has been verified successfully!');
        toast.success('Email verified successfully!');
      } catch (error) {
        setStatus('error');
        setMessage(error.message || 'Verification link is invalid or has expired.');
        toast.error(error.message || 'Email verification failed.');
      }
    };

    performVerification();
  }, [token]);

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface-50 dark:bg-surface-950 transition-colors duration-300">
      <div className="max-w-md w-full glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl text-center flex flex-col items-center">
        <Link to="/" className="inline-flex items-center justify-center gap-1.5 text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-primary-500 to-primary-300 bg-clip-text text-transparent">
          <img src="/logo.png" alt="Smart L&F Logo" className="h-8 w-8 object-contain translate-y-0.5" />
          Smart L&F
        </Link>

        {status === 'loading' && (
          <div className="flex flex-col items-center my-6">
            <FiLoader className="text-5xl text-primary-500 animate-spin mb-4" />
            <h2 className="text-xl font-bold font-display text-surface-900 dark:text-white mb-2">
              Verifying Email
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 leading-relaxed">
              {message}
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="flex flex-col items-center my-6 animate-scale-in">
            <FiCheckCircle className="text-6xl text-emerald-500 mb-4" />
            <h2 className="text-xl font-bold font-display text-surface-900 dark:text-white mb-2">
              Account Verified!
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-8 leading-relaxed">
              {message}
            </p>
            <Link to="/login" className="btn btn-primary w-full rounded-lg py-2.5">
              Go to Login
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center my-6 animate-scale-in">
            <FiXCircle className="text-6xl text-red-500 mb-4" />
            <h2 className="text-xl font-bold font-display text-surface-900 dark:text-white mb-2">
              Verification Failed
            </h2>
            <p className="text-sm text-surface-500 dark:text-surface-400 mb-8 leading-relaxed">
              {message}
            </p>
            <div className="flex flex-col gap-3 w-full">
              <Link to="/login" className="btn btn-secondary w-full rounded-lg py-2">
                Back to Login
              </Link>
              <Link to="/register" className="btn btn-primary w-full rounded-lg py-2">
                Register Again
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyEmail;

