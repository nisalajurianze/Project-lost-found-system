// ============================================
// Loader Spinner Component
// Centered page loading and tiny inline loaders
// ============================================

import React from 'react';

export const Loader = ({
  size = 'md',
  fullPage = false,
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  };

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <img 
        src="/logo.png" 
        alt="Loading..."
        className={`inline-block animate-spin object-contain ${sizeClasses[size] || sizeClasses.md}`}
        style={{ animationDuration: '1.5s' }}
      />
    </div>
  );

  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-surface-50 dark:bg-surface-950 transition-colors duration-300">
        <div className="relative flex items-center gap-4 px-8 py-5 bg-surface-900 rounded-xl border-2 border-white/70 shadow-[0_0_40px_rgba(255,255,255,0.6)] animate-pulse">
          <img 
            src="/logo.png" 
            alt="Smart L&F Logo"
            className="h-14 w-14 sm:h-16 sm:w-16 object-contain translate-y-1"
          />
          <span className="text-4xl sm:text-5xl font-black font-display tracking-tight bg-gradient-to-r from-primary-400 to-primary-200 bg-clip-text text-transparent">
            Smart L&F
          </span>
        </div>
        <span className="mt-8 text-sm font-medium text-surface-500 dark:text-surface-400 animate-pulse tracking-widest uppercase">
          Initializing System...
        </span>
      </div>
    );
  }

  return spinner;
};

export default Loader;

