// ============================================
// Admin Route Guard
// Restricts admin subpages to users with admin role
// ============================================

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Loader from '../components/common/Loader';

export const AdminRoute = () => {
  const { user, isAuthenticated, isLoading } = useSelector((state) => state.auth);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-surface-50 dark:bg-surface-900">
        <Loader />
      </div>
    );
  }

  // Redirect to home if not admin
  return isAuthenticated && user?.role === 'admin' ? (
    <Outlet />
  ) : (
    <Navigate to="/" replace />
  );
};

export default AdminRoute;
// 

