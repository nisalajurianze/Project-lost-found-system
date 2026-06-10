// ============================================
// Public Page Layout Wrapper
// Navbar, footer, and main content routing Outlet
// ============================================

import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';

export const PublicLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <Navbar />
      <main className="flex-1 flex flex-col w-full">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
