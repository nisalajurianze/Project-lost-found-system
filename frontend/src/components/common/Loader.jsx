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
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl'
  };

  const spinner = (
    <div className={`flex flex-col items-center justify-center gap-3 ${className}`}>
      <span 
        className={`inline-block animate-spin origin-center ${sizeClasses[size] || sizeClasses.md}`}
        role="img" 
        aria-label="loading"
      >
        🔍
      </span>
    </div>
  );

  if (fullPage) {
    return (
      <div className="flex flex-col h-[50vh] w-full items-center justify-center gap-4">
        {spinner}
        <span className="text-sm font-medium text-surface-500 dark:text-surface-400 animate-pulse">
          Loading...
        </span>
      </div>
    );
  }

  return spinner;
};

export default Loader;

