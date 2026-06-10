// ============================================
// Status Badge Component
// Render coloured status pills based on enums
// ============================================

import React from 'react';
import { getStatusBadgeClass, capitalize } from '../../utils/helpers';

export const StatusBadge = ({ status, className = '' }) => {
  const badgeClass = getStatusBadgeClass(status);
  
  return (
    <span className={`badge ${badgeClass} ${className}`}>
      {capitalize(status)}
    </span>
  );
};

export default StatusBadge;
