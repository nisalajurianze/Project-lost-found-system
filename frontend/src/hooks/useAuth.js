// ============================================
// Auth Custom Hook
// Simple wrapper to access Redux auth selectors & dispatch actions
// ============================================

import { useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  registerUser,
  loginUser,
  logoutUser,
  fetchCurrentUser,
  updateUserProfile
} from '../redux/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const { user, isAuthenticated, isLoading, error } = useSelector((state) => state.auth);

  const register = useCallback((userData) => dispatch(registerUser(userData)).unwrap(), [dispatch]);
  
  const login = useCallback((credentials) => dispatch(loginUser(credentials)).unwrap(), [dispatch]);

  const logout = useCallback(() => dispatch(logoutUser()), [dispatch]);

  const getMe = useCallback(() => dispatch(fetchCurrentUser()).unwrap(), [dispatch]);

  const updateProfile = useCallback((updatedUser) => dispatch(updateUserProfile(updatedUser)), [dispatch]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    register,
    login,
    logout,
    getMe,
    updateProfile
  };
};

export default useAuth;
