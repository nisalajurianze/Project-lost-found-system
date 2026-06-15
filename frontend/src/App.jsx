import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import DashboardLayout from './components/layout/DashboardLayout';
import AdminLayout from './components/layout/AdminLayout';

// Guard Routes
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';

// Hooks
import useAuth from './hooks/useAuth';
import useSocket from './hooks/useSocket';

// Constants
import { LOCAL_STORAGE_USER_KEY } from './utils/constants';

// Public Pages (Lazy Loaded)
const Home = lazy(() => import('./pages/public/Home'));
const Login = lazy(() => import('./pages/public/Login'));
const Register = lazy(() => import('./pages/public/Register'));
const ForgotPassword = lazy(() => import('./pages/public/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/public/ResetPassword'));
const About = lazy(() => import('./pages/public/About'));
const Contact = lazy(() => import('./pages/public/Contact'));
const LostItems = lazy(() => import('./pages/public/LostItems'));
const LostItemDetail = lazy(() => import('./pages/public/LostItemDetail'));
const FoundItems = lazy(() => import('./pages/public/FoundItems'));
const FoundItemDetail = lazy(() => import('./pages/public/FoundItemDetail'));
const VerifyEmail = lazy(() => import('./pages/public/VerifyEmail'));

// User Pages (Lazy Loaded)
const Dashboard = lazy(() => import('./pages/user/Dashboard'));
const Profile = lazy(() => import('./pages/user/Profile'));
const ReportLost = lazy(() => import('./pages/user/ReportLost'));
const ReportFound = lazy(() => import('./pages/user/ReportFound'));
const MyLostItems = lazy(() => import('./pages/user/MyLostItems'));
const MyFoundItems = lazy(() => import('./pages/user/MyFoundItems'));
const MyMatches = lazy(() => import('./pages/user/MyMatches'));
const Notifications = lazy(() => import('./pages/user/Notifications'));

// Admin Pages (Lazy Loaded)
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const ManageUsers = lazy(() => import('./pages/admin/ManageUsers'));
const ManageLostItems = lazy(() => import('./pages/admin/ManageLostItems'));
const ManageFoundItems = lazy(() => import('./pages/admin/ManageFoundItems'));
const ManageMatches = lazy(() => import('./pages/admin/ManageMatches'));
const Feedback = lazy(() => import('./pages/admin/Feedback'));
const AdminLogs = lazy(() => import('./pages/admin/AdminLogs'));
const Analytics = lazy(() => import('./pages/admin/Analytics'));
const ManageCategories = lazy(() => import('./pages/admin/ManageCategories'));

// Fallback loader
import Loader from './components/common/Loader';

// 404 Page (Inline or separate, we will just use a simple one)
const NotFound = () => (
  <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
    <h1 className="text-6xl font-bold text-slate-800 dark:text-slate-100 mb-4">404</h1>
    <h2 className="text-2xl font-semibold text-slate-600 dark:text-slate-300 mb-6">Page Not Found</h2>
    <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
      The page you're looking for doesn't exist or has been moved.
    </p>
    <a href="/" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
      Return Home
    </a>
  </div>
);

const App = () => {
  const dispatch = useDispatch();
  const { user, getMe, isAuthenticated } = useAuth();
  const { mode } = useSelector((state) => state.theme);

  // Authenticate user on page load/refresh
  useEffect(() => {
    const userInStorage = localStorage.getItem(LOCAL_STORAGE_USER_KEY);
    if (userInStorage) {
      getMe().catch(() => {
        console.warn('Session expired or token invalid');
      });
    }
  }, [dispatch, getMe]);

  // Apply dark mode theme class globally
  useEffect(() => {
    if (mode === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [mode]);

  // Initialize socket connections for authenticated users
  useSocket(user);

  return (
    <Suspense fallback={<div className="h-screen w-screen flex items-center justify-center"><Loader size="lg" /></div>}>
      <Routes>
        {/* Public Routes */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/lost-items" element={<LostItems />} />
          <Route path="/lost-items/:id" element={<LostItemDetail />} />
          <Route path="/found-items" element={<FoundItems />} />
          <Route path="/found-items/:id" element={<FoundItemDetail />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          
          {/* Catch-all 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* User Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/profile" element={<Profile />} />
            <Route path="/dashboard/report-lost" element={<ReportLost />} />
            <Route path="/dashboard/report-found" element={<ReportFound />} />
            <Route path="/dashboard/my-lost" element={<MyLostItems />} />
            <Route path="/dashboard/my-found" element={<MyFoundItems />} />
            <Route path="/dashboard/my-matches" element={<MyMatches />} />
            <Route path="/dashboard/notifications" element={<Notifications />} />
          </Route>
        </Route>

        {/* Admin Protected Routes */}
        <Route element={<AdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/lost-items" element={<ManageLostItems />} />
            <Route path="/admin/found-items" element={<ManageFoundItems />} />
            <Route path="/admin/matches" element={<ManageMatches />} />
            <Route path="/admin/feedback" element={<Feedback />} />
            <Route path="/admin/logs" element={<AdminLogs />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="/admin/categories" element={<ManageCategories />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};

export default App;

