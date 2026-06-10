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
    sm: 'h-6 w-6 border-2',
    md: 'h-10 w-10 border-4',
    lg: 'h-16 w-16 border-4'
  };

  const spinner = (
    <div
      className={`animate-spin rounded-full border-primary-500 border-t-transparent ${
        sizeClasses[size] || sizeClasses.md
      } ${className}`}
    />
  );

  if (fullPage) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        {spinner}
      </div>
    );
  }

  return spinner;
};

export default Loader;

