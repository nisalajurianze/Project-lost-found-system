// ============================================
// Statistics Card Component
// Layout widget to display totals (counts, labels)
// ============================================

import React from 'react';

export const StatCard = ({
  title,
  value,
  icon,
  color = 'primary',
  className = ''
}) => {
  const colorSchemes = {
    primary: 'bg-primary-500/10 text-primary-600 dark:text-primary-400',
    success: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    warning: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    danger: 'bg-red-500/10 text-red-600 dark:text-red-400',
    info: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400'
  };

  const selectedColor = colorSchemes[color] || colorSchemes.primary;

  return (
    <div className={`stat-card glass-card-hover flex items-center p-6 bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700/60 shadow-sm ${className}`}>
      <div className={`stat-icon p-4 rounded-xl flex-shrink-0 text-3xl ${selectedColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-surface-500 dark:text-surface-400">
          {title}
        </p>
        <h3 className="text-3xl font-extrabold font-display text-surface-900 dark:text-white mt-1">
          {value}
        </h3>
      </div>
    </div>
  );
};

export default StatCard;
// 

