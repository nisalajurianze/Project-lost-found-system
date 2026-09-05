import React, { useEffect, Suspense, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { clearAuth } from './redux/slices/authSlice';

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
import { lazyWithRetry } from './utils/lazyWithRetry';

// Public Pages (Lazy Loaded)
const Home = lazyWithRetry(() => import('./pages/public/Home'));
const Login = lazyWithRetry(() => import('./pages/public/Login'));
const Register = lazyWithRetry(() => import('./pages/public/Register'));
const ForgotPassword = lazyWithRetry(() => import('./pages/public/ForgotPassword'));
const ResetPassword = lazyWithRetry(() => import('./pages/public/ResetPassword'));
const About = lazyWithRetry(() => import('./pages/public/About'));
const Contact = lazyWithRetry(() => import('./pages/public/Contact'));
const SearchItems = lazyWithRetry(() => import('./pages/public/SearchItems'));
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
const LocationKnowledge = lazyWithRetry(() => import('./pages/admin/LocationKnowledge'));
const AIFeedbackReview = lazyWithRetry(() => import('./pages/admin/AIFeedbackReview'));
const ManageClaims = lazyWithRetry(() => import('./pages/admin/ManageClaims'));
const AIChatbot = lazyWithRetry(() => import('./components/common/AIChatbot'));

// Fallback loader
import Loader from './components/common/Loader';
import MobileBottomNav from './components/layout/MobileBottomNav';
import ScrollToTopButton from './components/common/ScrollToTopButton';
import AccessibilityPreferences from './components/common/AccessibilityPreferences';
import { useLanguage } from './i18n/LanguageContext';

// Scroll to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// 404 Page (Inline or separate, we will just use a simple one)
const NotFound = () => {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
      <h1 className="text-6xl font-bold text-slate-800 dark:text-slate-100 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-slate-600 dark:text-slate-300 mb-6">{t('error.notFoundTitle')}</h2>
      <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">{t('error.notFoundDesc')}</p>
      <a href="/" className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">{t('error.returnHome')}</a>
    </div>
  );
};

const App = () => {
  const { t } = useLanguage();
  const dispatch = useDispatch();
  const { user, getMe } = useAuth();
  const { mode } = useSelector((state) => state.theme);
  const [assistantReady, setAssistantReady] = useState(false);

  // Restore the authenticated session from HTTP-only cookies.
  useEffect(() => {
    getMe().catch(() => undefined);
  }, [dispatch, getMe]);

  // Keep Redux authentication state in sync when the shared API client cannot
  // refresh an expired HTTP-only cookie session.
  useEffect(() => {
    const handleAuthLogout = () => dispatch(clearAuth());
    window.addEventListener('auth-logout', handleAuthLogout);
    return () => window.removeEventListener('auth-logout', handleAuthLogout);
  }, [dispatch]);

  // Apply dark mode theme class globally
  useEffect(() => {
    const applyTheme = () => {
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else if (mode === 'light') {
        document.documentElement.classList.remove('dark');
      } else if (mode === 'system') {
        const userPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (userPrefersDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    applyTheme();

    // Listen for OS theme changes if in system mode
    if (mode === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme();
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [mode]);

  // Initialize socket connections for authenticated users
  useSocket(user);

  useEffect(() => {
    const revealAssistant = () => setAssistantReady(true);
    const idleId = window.requestIdleCallback
      ? window.requestIdleCallback(revealAssistant, { timeout: 2000 })
      : window.setTimeout(revealAssistant, 1200);

    window.addEventListener('pointerdown', revealAssistant, { once: true });
    window.addEventListener('keydown', revealAssistant, { once: true });
    return () => {
      if (window.cancelIdleCallback && typeof idleId === 'number') window.cancelIdleCallback(idleId);
      else window.clearTimeout(idleId);
      window.removeEventListener('pointerdown', revealAssistant);
      window.removeEventListener('keydown', revealAssistant);
    };
  }, []);

  return (
    <>
      <a href="#main-content" className="skip-link">{t('nav.skip')}</a>
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
          <Route path="/search" element={<SearchItems />} />
          <Route path="/lost-items" element={<Navigate to="/search?type=lost" replace />} />
          <Route path="/lost-items/:id" element={<LostItemDetail />} />
          <Route path="/found-items" element={<Navigate to="/search?type=found" replace />} />
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
            <Route path="/admin/locations" element={<LocationKnowledge />} />
            <Route path="/admin/ai-feedback" element={<AIFeedbackReview />} />
            <Route path="/admin/claims" element={<ManageClaims />} />
          </Route>
        </Route>
      </Routes>
      <Suspense fallback={null}>
        {assistantReady && <AIChatbot />}
      </Suspense>
      <MobileBottomNav />
      <ScrollToTopButton />
      <AccessibilityPreferences />
    </Suspense>
    </>
  );
};

export default App;
