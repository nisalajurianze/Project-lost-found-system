// ============================================
// Footer Component
// Sleek responsive footer layout
// ============================================

import React from 'react';
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="w-full border-t border-surface-200/50 bg-white dark:border-surface-800/50 dark:bg-surface-950/80 transition-colors duration-300 py-8 no-print mt-auto pb-24 lg:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-col items-center md:items-start">
            <Link to="/" className="flex items-center gap-1.5 mb-2 hover:opacity-80 transition-opacity w-fit">
              <img src="/logo.png" alt="Smart L&F Logo" className="h-8 w-8 object-contain translate-y-0.5" />
              <span className="text-2xl font-bold font-display tracking-tight bg-gradient-to-r from-primary-500 to-primary-300 bg-clip-text text-transparent whitespace-nowrap">
                Smart L&F
              </span>
            </Link>
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Automating recovery of university belongings with AI.
            </p>
          </div>
          
          <div className="flex gap-6 text-sm text-surface-600 dark:text-surface-400 font-medium">
            <Link to="/about" className="hover:text-primary-500 transition-colors">About</Link>
            <Link to="/contact" className="hover:text-primary-500 transition-colors">Contact</Link>
            <Link to="/lost-items" className="hover:text-primary-500 transition-colors">Lost Items</Link>
            <Link to="/found-items" className="hover:text-primary-500 transition-colors">Found Items</Link>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-surface-100 dark:border-surface-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-surface-400">
          <p>&copy; {new Date().getFullYear()} Smart Lost & Found. All rights reserved.</p>
          <p>Designed for university project submission and live demonstration.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

