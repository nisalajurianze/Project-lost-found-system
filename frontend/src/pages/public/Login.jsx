// ============================================
// Login Page Component
// Input validations, session token storage, and error indicators
// ============================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser, clearAuth } from '../../redux/slices/authSlice';
import { validateEmail } from '../../utils/validators';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';

export const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const { isAuthenticated, isLoading, error } = useSelector((state) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  // Redirect path from location state
  const from = location.state?.from?.pathname || '/dashboard';

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  // Clear auth errors on unmount
  useEffect(() => {
    return () => {
      dispatch(clearAuth());
    };
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    // Validate inputs
    const errors = {};
    if (!email) errors.email = 'Email is required';
    else if (!validateEmail(email)) errors.email = 'Invalid email syntax';
    if (!password) errors.password = 'Password is required';

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      await dispatch(loginUser({ email, password })).unwrap();
      toast.success('Welcome back!');
    } catch (err) {
      toast.error(err || 'Failed to authenticate.');
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface-100 dark:bg-surface-950 transition-colors duration-300">
      <div className="max-w-md w-full glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl">
        <div className="text-center mb-8">
          <Link to="/" className="text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-primary-500 to-primary-300 bg-clip-text text-transparent">
            🔍 Smart L&F
          </Link>
          <h2 className="text-xl font-bold font-display text-surface-900 dark:text-white mt-4">
            Sign In to Your Account
          </h2>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            Access your student or administrator dashboard
          </p>
        </div>

        {/* Global Error Banner */}
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
            error={fieldErrors.email}
            required
          />

          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor="password" className="input-label mb-0">
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-primary-500 hover:text-primary-600 dark:text-primary-400"
              >
                Forgot Password?
              </Link>
            </div>
            <Input
              name="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={fieldErrors.password}
              required
            />
          </div>

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-4"
            isLoading={isLoading}
          >
            Sign In
          </Button>
        </form>

        <div className="text-center mt-6 pt-6 border-t border-surface-100 dark:border-surface-800 text-xs text-surface-500 dark:text-surface-400">
          New to the platform?{' '}
          <Link
            to="/register"
            className="font-bold text-primary-500 hover:text-primary-600 dark:text-primary-400"
          >
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
