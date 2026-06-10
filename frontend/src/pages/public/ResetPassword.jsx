// ============================================
// Reset Password Page Component
// Validates token links and saves new passwords
// ============================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import authService from '../../services/authService';
import { validatePassword } from '../../utils/validators';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import { FiCheckCircle } from 'react-icons/fi';

export const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setError('Invalid URL. Password reset token is missing.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Token is missing. Cannot reset password.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (!validatePassword(password)) {
      setError('Password must contain at least 6 characters, one uppercase, one lowercase, and one number.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await authService.resetPassword(token, password);
      setSuccess(true);
      toast.success('Password reset successfully!');
    } catch (err) {
      setError(err.message || 'Failed to reset password. Token may have expired.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface-100 dark:bg-surface-950 transition-colors duration-300">
        <div className="max-w-md w-full glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl text-center flex flex-col items-center">
          <FiCheckCircle className="text-6xl text-emerald-500 mb-4 animate-scale-in" />
          <h2 className="text-xl font-bold font-display text-surface-900 dark:text-white mb-2">
            Password Changed!
          </h2>
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-6 leading-relaxed">
            Your password was updated successfully. You can now log in using your new credentials.
          </p>
          <Link to="/login" className="btn btn-primary w-full rounded-lg">
            Log In Now
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
            Create New Password
          </h2>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            Choose a strong, unique password for your account
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-500 dark:bg-red-950/20 dark:border-red-900/30 dark:text-red-400 rounded-lg mb-6">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="New Password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!token}
            required
          />

          <Input
            label="Confirm New Password"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={!token}
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-6"
            isLoading={isLoading}
            disabled={!token}
          >
            Reset Password
          </Button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
