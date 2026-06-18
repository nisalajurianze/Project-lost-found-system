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

  const isSmall = size === 'sm';
  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${isSmall ? '' : 'w-full min-h-[300px] sm:min-h-[400px]'} ${className}`}>
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
        <div className="flex items-center gap-4 animate-pulse drop-shadow-[0_0_15px_rgba(125,211,252,0.8)] dark:drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
          <img 
            src="/logo.png" 
            alt="Smart L&F Logo"
            className="h-16 w-16 sm:h-20 sm:w-20 object-contain drop-shadow-xl"
          />
          <span className="text-4xl sm:text-5xl font-black font-display tracking-tight bg-gradient-to-r from-primary-500 to-primary-300 dark:from-primary-400 dark:to-primary-200 bg-clip-text text-transparent">
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

