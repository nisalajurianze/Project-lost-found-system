// ============================================
// Registration Page Component
// Input validations (E.164, regex passwords), and verification logs
// ============================================

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { GoogleLogin } from '@react-oauth/google';
import { registerUser, loginUser, googleLoginUser, clearAuthError } from '../../redux/slices/authSlice';
import { validateEmail, validatePassword, validatePhone, validateStudentId } from '../../utils/validators';
import Input from '../../components/common/Input';
import Button from '../../components/common/Button';
import toast from 'react-hot-toast';
import { FiCheckCircle } from 'react-icons/fi';

export const Register = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { isAuthenticated, isLoading, error } = useSelector((state) => state.auth);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [fieldErrors, setFieldErrors] = useState({});
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Clear auth errors on unmount
  useEffect(() => {
    return () => {
      dispatch(clearAuthError());
    };
  }, [dispatch]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFieldErrors({});

    // Validate inputs
    const errors = {};
    if (!fullName) errors.fullName = 'Full name is required';
    if (!email) errors.email = 'Email is required';
    else if (!validateEmail(email)) errors.email = 'Invalid email syntax';
    
    if (!phone) errors.phone = 'Phone number is required';
    else if (!validatePhone(phone)) {
      errors.phone = 'Invalid SL phone number (e.g. 0771234567 or +94771234567)';
    }
    
    if (!studentId) errors.studentId = 'Student ID is required';
    else if (!validateStudentId(studentId)) errors.studentId = 'Student ID must be 2-30 characters';
    
    if (!password) errors.password = 'Password is required';
    else if (!validatePassword(password)) {
      errors.password = 'Password must be min 6 characters and contain an uppercase, lowercase, and digit';
    }
    
    if (confirmPassword !== password) {
      errors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    try {
      const res = await dispatch(
        registerUser({
          fullName,
          email,
          phone,
          studentId,
          password,
          confirmPassword
        })
      ).unwrap();

      if (res && res.token) {
        toast.success('Registration successful! Welcome aboard!');
      } else {
        toast.success('Registration successful! Please check your email.');
        // Auto login after successful registration (will prompt for email verification or succeed if disabled)
        await dispatch(
          loginUser({ email, password })
        ).unwrap();
      }

      // Show a nice prompt for profile picture
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white dark:bg-surface-800 shadow-2xl rounded-2xl pointer-events-auto flex flex-col ring-1 ring-black ring-opacity-5 overflow-hidden`}>
          <div className="p-5 flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <div className="h-10 w-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <span className="text-xl">📸</span>
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-sm font-bold text-surface-900 dark:text-white">
                Welcome to the community! 🎉
              </p>
              <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
                Put a face to your name! Adding a profile picture helps others recognize you when claiming items.
              </p>
            </div>
          </div>
          <div className="bg-surface-50 dark:bg-surface-800/50 px-4 py-3 flex justify-end gap-2 border-t border-surface-100 dark:border-surface-700">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-700 rounded-xl transition-colors"
            >
              Maybe Later
            </button>
            <button
              onClick={() => {
                toast.dismiss(t.id);
                navigate('/dashboard/profile');
              }}
              className="px-4 py-2 text-sm font-bold text-white bg-primary-500 hover:bg-primary-600 rounded-xl shadow-md transition-colors"
            >
              Upload Picture
            </button>
          </div>
        </div>
      ), { duration: 10000, position: 'bottom-right' });

      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.message || (typeof err === 'string' ? err : 'Registration failed. Please try again.');
      toast.error(msg);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      await dispatch(googleLoginUser(credentialResponse.credential)).unwrap();
      toast.success('Welcome! You have successfully signed up with Google.');
    } catch (err) {
      const msg = err?.message || (typeof err === 'string' ? err : 'Google registration failed.');
      toast.error(msg);
    }
  };

  const handleGoogleError = () => {
    toast.error('Google Sign-In was unsuccessful. Try again later.');
  };

  if (registrationSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-surface-100 dark:bg-surface-950 transition-colors duration-300">
        <div className="max-w-md w-full glass-card p-8 bg-white border border-surface-200 dark:border-surface-800 dark:bg-surface-900 shadow-xl text-center flex flex-col items-center">
          <FiCheckCircle className="text-6xl text-emerald-500 mb-4 animate-scale-in" />
          <h2 className="text-xl font-bold font-display text-surface-900 dark:text-white mb-2">
            Verification Email Sent!
          </h2>
          <p className="text-sm text-surface-500 dark:text-surface-400 mb-6 leading-relaxed">
            We sent a verification link to <strong>{email}</strong>. Please check your inbox and click the link to activate your account.
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
          <Link to="/" className="inline-flex items-center justify-center gap-1.5 text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-primary-500 to-primary-300 bg-clip-text text-transparent">
            <img src="/logo.png" alt="Smart L&F Logo" className="h-8 w-8 object-contain translate-y-0.5" />
            Smart L&F
          </Link>
          <h2 className="text-xl font-bold font-display text-surface-900 dark:text-white mt-4">
            Create Your Account
          </h2>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            Sign up to report lost/found campus property
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
            label="Full Name"
            name="fullName"
            placeholder="e.g. Dineth Perera"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={fieldErrors.fullName}
            required
          />

          <Input
            label="Email Address"
            name="email"
            type="email"
            placeholder="e.g. dineth@student.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
            required
          />

          <Input
            label="Phone Number"
            name="phone"
            placeholder="e.g. 0771234567 or +94771234567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={fieldErrors.phone}
            required
            helperText="Sri Lankan format required."
          />

          <Input
            label="Student ID / Admin Code"
            name="studentId"
            placeholder="e.g. UWU-2023-CS-0045"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            error={fieldErrors.studentId}
            required
          />

          <Input
            label="Password"
            name="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={fieldErrors.password}
            required
          />

          <Input
            label="Confirm Password"
            name="confirmPassword"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={fieldErrors.confirmPassword}
            required
          />

          <Button
            type="submit"
            variant="primary"
            className="w-full mt-6"
            isLoading={isLoading}
          >
            Sign Up
          </Button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-2">
          <span className="h-px w-full bg-surface-200 dark:bg-surface-800"></span>
          <span className="text-xs text-surface-500 uppercase tracking-widest font-semibold">Or</span>
          <span className="h-px w-full bg-surface-200 dark:bg-surface-800"></span>
        </div>

        <div className="mt-6 flex justify-center w-full">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            theme="outline"
            size="large"
            text="signup_with"
            shape="rectangular"
          />
        </div>

        <div className="text-center mt-6 pt-6 border-t border-surface-100 dark:border-surface-800 text-xs text-surface-500 dark:text-surface-400">
          Already have an account?{' '}
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

export default Register;

