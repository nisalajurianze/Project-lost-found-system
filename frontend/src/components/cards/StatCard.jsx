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
    primary: 'bg-primary-500/15 text-primary-600 dark:bg-primary-500/20 dark:text-primary-300',
    success: 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-300',
    warning: 'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-300',
    danger: 'bg-red-500/15 text-red-600 dark:bg-red-500/20 dark:text-red-300',
    info: 'bg-cyan-500/15 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-300',
    blue: 'bg-blue-500/15 text-blue-600 dark:bg-blue-500/20 dark:text-blue-300',
    indigo: 'bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300',
    purple: 'bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-300'
  };

  const selectedColor = colorSchemes[color] || colorSchemes.primary;

  return (
    <div className={`stat-card relative overflow-hidden group flex items-center p-6 bg-white dark:bg-surface-800/80 dark:backdrop-blur-xl rounded-2xl border border-surface-200 dark:border-surface-700/50 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 ${className}`}>
      <div className={`stat-icon p-4 rounded-2xl flex-shrink-0 text-3xl transition-transform duration-300 group-hover:scale-110 ${selectedColor}`}>
        {icon}
      </div>
      <div className="ml-5">
        <p className="text-sm font-semibold tracking-wide text-surface-500 dark:text-surface-400 uppercase">
          {title}
        </p>
        <h3 className="text-4xl font-extrabold font-display text-surface-900 dark:text-white mt-1.5 tracking-tight">
          {value}
        </h3>
      </div>
    </div>
  );
};

export default StatCard;
// 

