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
        <img 
          src="/logo.png" 
          alt="Smart L&F Logo"
          className="inline-block animate-spin h-16 w-16 sm:h-20 sm:w-20 object-contain"
          style={{ animationDuration: '1.5s' }}
        />
        <span className="text-sm font-medium text-surface-500 dark:text-surface-400 animate-pulse">
          Loading application...
        </span>
      </div>
    );
  }

  return spinner;
};

export default Loader;

