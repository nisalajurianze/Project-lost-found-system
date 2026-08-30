// ============================================
// Public Page Layout Wrapper
// Navbar, footer, and main content routing Outlet
// ============================================

import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import Footer from './Footer';
import { useLanguage } from '../../i18n/LanguageContext';

export const PublicLayout = () => {
  const { language } = useLanguage();
  const responsiveBottomPadding = language === 'en' ? 'xl:pb-0' : '2xl:pb-0';

  return (
    <div className="min-h-screen flex flex-col bg-surface-50 dark:bg-surface-900 transition-colors duration-300">
      <Navbar />
      <main id="main-content" tabIndex={-1} className={`flex-1 flex flex-col w-full pb-[var(--mobile-bottom-nav-height)] ${responsiveBottomPadding}`}>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default PublicLayout;
