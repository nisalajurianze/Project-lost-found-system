// ============================================
// Forgot Password Page Component
// Requests reset links via email
// ============================================

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import authService from '../../services/authService';
import { validateEmail } from '../../utils/validators';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import { FiMail } from 'react-icons/fi';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email) {
      setError('Email is required.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please provide a valid email.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
      setRequestSent(true);
      toast.success('Reset link sent!');
    } catch (err) {
      setError(err.message || 'Request failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (requestSent) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface-100 dark:bg-surface-950 transition-colors duration-300">
        <div className="max-w-md w-full glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl text-center flex flex-col items-center">
          <FiMail className="text-6xl text-primary-500 mb-4 animate-scale-in" />
          <h2 className="text-xl font-bold font-display text-surface-900 dark:text-white mb-2">
            Reset Link Dispatched
          </h2>
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-6 leading-relaxed">
            If your email is registered, we sent a password reset link to <strong>{email}</strong>. Please check your inbox.
          </p>
          <Link to="/login" className="btn btn-primary w-full rounded-lg">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface-100 dark:bg-surface-950 transition-colors duration-300">
      <div className="max-w-md w-full glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-primary-500 to-primary-300 bg-clip-text text-transparent">
            🔍 Smart L&F
          </Link>
          <h2 className="text-xl font-bold font-display text-surface-900 dark:text-white mt-4">
            Reset Password
          </h2>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            Provide your email address to receive a password reset link
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-500 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-lg mb-6">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            name="email"
            type="email"
            placeholder="e.g. student@student.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-4"
            isLoading={isLoading}
          >
            Send Reset Link
          </Button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-surface-100 dark:border-surface-800 text-xs text-surface-500 dark:text-surface-400">
          Remembered your password?{' '}
          <Link
            to="/login"
            className="font-bold text-primary-500 hover:text-primary-600 dark:text-primary-400"
          >
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;

