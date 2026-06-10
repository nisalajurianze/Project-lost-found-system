import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
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
import { LOCAL_STORAGE_TOKEN_KEY } from './utils/constants';

// Public Pages
import Home from './pages/public/Home';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import ForgotPassword from './pages/public/ForgotPassword';
import ResetPassword from './pages/public/ResetPassword';
import About from './pages/public/About';
import Contact from './pages/public/Contact';
import LostItems from './pages/public/LostItems';
import LostItemDetail from './pages/public/LostItemDetail';
import FoundItems from './pages/public/FoundItems';
import FoundItemDetail from './pages/public/FoundItemDetail';
import VerifyEmail from './pages/public/VerifyEmail';

// User Pages
import Dashboard from './pages/user/Dashboard';
import Profile from './pages/user/Profile';
import ReportLost from './pages/user/ReportLost';
import ReportFound from './pages/user/ReportFound';
import MyLostItems from './pages/user/MyLostItems';
import MyFoundItems from './pages/user/MyFoundItems';
import MyMatches from './pages/user/MyMatches';
import MyClaims from './pages/user/MyClaims';
import Notifications from './pages/user/Notifications';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import ManageUsers from './pages/admin/ManageUsers';
import ManageLostItems from './pages/admin/ManageLostItems';
import ManageFoundItems from './pages/admin/ManageFoundItems';
import ManageClaims from './pages/admin/ManageClaims';
import ManageMatches from './pages/admin/ManageMatches';
import Feedback from './pages/admin/Feedback';
import AdminLogs from './pages/admin/AdminLogs';
import Analytics from './pages/admin/Analytics';
import ManageCategories from './pages/admin/ManageCategories';

const App = () => {
  const dispatch = useDispatch();
  const { user, getMe, isAuthenticated } = useAuth();
  const { mode } = useSelector((state) => state.theme);

  // Authenticate user on page load/refresh
  useEffect(() => {
    const token = localStorage.getItem(LOCAL_STORAGE_TOKEN_KEY);
    if (token) {
      getMe().catch(() => {
        console.warn('Session expired or token invalid');
      });
    }
  }, [dispatch]);

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
          <Route path="/dashboard/my-claims" element={<MyClaims />} />
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
          <Route path="/admin/claims" element={<ManageClaims />} />
          <Route path="/admin/matches" element={<ManageMatches />} />
          <Route path="/admin/feedback" element={<Feedback />} />
          <Route path="/admin/logs" element={<AdminLogs />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/categories" element={<ManageCategories />} />
        </Route>
      </Route>
    </Routes>
  );
};

export default App;

