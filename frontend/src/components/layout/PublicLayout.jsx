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
      <main id="main-content" tabIndex={-1} className="flex-1 flex flex-col w-full pb-[var(--mobile-bottom-nav-height)] lg:pb-0">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;

