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
      <div className="flex flex-col h-[60vh] w-full items-center justify-center gap-6">
        <div className="flex items-center gap-3">
          <img 
            src="/logo.png" 
            alt="Smart L&F Logo"
            className="inline-block animate-spin h-12 w-12 sm:h-14 sm:w-14 object-contain"
            style={{ animationDuration: '1.5s' }}
          />
          <span className="text-3xl sm:text-4xl font-bold font-display tracking-tight bg-gradient-to-r from-primary-500 to-primary-300 bg-clip-text text-transparent">
            Smart L&F
          </span>
        </div>
        <span className="text-sm font-medium text-surface-500 dark:text-surface-400 animate-pulse">
          Loading application...
        </span>
      </div>
    );
  }

  return spinner;
};

export default Loader;

