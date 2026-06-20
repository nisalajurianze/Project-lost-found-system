import React, { useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
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

// Custom lazy loading wrapper to handle chunk load errors (e.g. after a new deployment)
const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      if (
        error.name === 'TypeError' || 
        error.message.includes('Failed to fetch dynamically imported module') ||
        error.message.includes('Importing a module script failed')
      ) {
        // A new deployment likely changed the chunk hashes. Refresh to get the latest version.
        window.location.reload();
        // Return a promise that never resolves so React doesn't crash while reloading
        return new Promise(() => {});
      }
      throw error;
    }
  });

// Public Pages (Lazy Loaded)
const Home = lazyWithRetry(() => import('./pages/public/Home'));
const Login = lazyWithRetry(() => import('./pages/public/Login'));
const Register = lazyWithRetry(() => import('./pages/public/Register'));
const ForgotPassword = lazyWithRetry(() => import('./pages/public/ForgotPassword'));
const ResetPassword = lazyWithRetry(() => import('./pages/public/ResetPassword'));
const About = lazyWithRetry(() => import('./pages/public/About'));
const Contact = lazyWithRetry(() => import('./pages/public/Contact'));
const LostItems = lazyWithRetry(() => import('./pages/public/LostItems'));
const LostItemDetail = lazyWithRetry(() => import('./pages/public/LostItemDetail'));
const FoundItems = lazyWithRetry(() => import('./pages/public/FoundItems'));
const FoundItemDetail = lazyWithRetry(() => import('./pages/public/FoundItemDetail'));
const VerifyEmail = lazyWithRetry(() => import('./pages/public/VerifyEmail'));

// User Pages (Lazy Loaded)
const Dashboard = lazyWithRetry(() => import('./pages/user/Dashboard'));
const Profile = lazyWithRetry(() => import('./pages/user/Profile'));
const ReportLost = lazyWithRetry(() => import('./pages/user/ReportLost'));
const ReportFound = lazyWithRetry(() => import('./pages/user/ReportFound'));
const EditLostItem = lazyWithRetry(() => import('./pages/user/EditLostItem'));
const EditFoundItem = lazyWithRetry(() => import('./pages/user/EditFoundItem'));
const MyLostItems = lazyWithRetry(() => import('./pages/user/MyLostItems'));
const MyFoundItems = lazyWithRetry(() => import('./pages/user/MyFoundItems'));
const MyMatches = lazyWithRetry(() => import('./pages/user/MyMatches'));
const MyClaims = lazyWithRetry(() => import('./pages/user/MyClaims'));
const Notifications = lazyWithRetry(() => import('./pages/user/Notifications'));
const VerifyResolution = lazyWithRetry(() => import('./pages/protected/VerifyResolution'));

// Admin Pages (Lazy Loaded)
const AdminDashboard = lazyWithRetry(() => import('./pages/admin/AdminDashboard'));
const ManageUsers = lazyWithRetry(() => import('./pages/admin/ManageUsers'));
const ManageLostItems = lazyWithRetry(() => import('./pages/admin/ManageLostItems'));
const ManageFoundItems = lazyWithRetry(() => import('./pages/admin/ManageFoundItems'));
const ManageMatches = lazyWithRetry(() => import('./pages/admin/ManageMatches'));
const Feedback = lazyWithRetry(() => import('./pages/admin/Feedback'));
const AdminLogs = lazyWithRetry(() => import('./pages/admin/AdminLogs'));
const Analytics = lazyWithRetry(() => import('./pages/admin/Analytics'));
const ManageCategories = lazyWithRetry(() => import('./pages/admin/ManageCategories'));
const SiteSettings = lazyWithRetry(() => import('./pages/admin/SiteSettings'));

// Fallback loader
import Loader from './components/common/Loader';
import AIChatbot from './components/common/AIChatbot';
import MobileBottomNav from './components/layout/MobileBottomNav';
import ScrollToTopButton from './components/common/ScrollToTopButton';

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

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
    <>
      <ScrollToTop />
      <Suspense fallback={<Loader fullPage={true} />}>
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
            <Route path="/dashboard/edit-lost/:id" element={<EditLostItem />} />
            <Route path="/dashboard/report-found" element={<ReportFound />} />
            <Route path="/dashboard/edit-found/:id" element={<EditFoundItem />} />
            <Route path="/dashboard/my-lost" element={<MyLostItems />} />
            <Route path="/dashboard/my-found" element={<MyFoundItems />} />
            <Route path="/dashboard/my-matches" element={<MyMatches />} />
            <Route path="/dashboard/claims" element={<MyClaims />} />
            <Route path="/dashboard/notifications" element={<Notifications />} />
            <Route path="/dashboard/verify-resolution/:type/:id" element={<VerifyResolution />} />
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
            <Route path="/admin/settings" element={<SiteSettings />} />
          </Route>
        </Route>
      </Routes>
      <AIChatbot />
      <MobileBottomNav />
      <ScrollToTopButton />
    </Suspense>
    </>
  );
};

export default App;

