// ============================================
// Auth Custom Hook
// Simple wrapper to access Redux auth selectors & dispatch actions
// ============================================

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

  const register = (userData) => dispatch(registerUser(userData)).unwrap();
  
  const login = (credentials) => dispatch(loginUser(credentials)).unwrap();

  const logout = () => dispatch(logoutUser());

  const getMe = () => dispatch(fetchCurrentUser()).unwrap();

  const updateProfile = (updatedUser) => dispatch(updateUserProfile(updatedUser));

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
