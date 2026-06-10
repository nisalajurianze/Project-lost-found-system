// ============================================
// Date Formatting Utilities
// relative and absolute date formatting
// ============================================

import { format, formatDistanceToNow, parseISO } from 'date-fns';

/**
 * Formats ISO date string to relative time (e.g. "2 hours ago").
 * @param {string|Date} date
 * @returns {string}
 */
export const formatRelativeTime = (date) => {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return formatDistanceToNow(parsedDate, { addSuffix: true });
};

/**
 * Formats ISO date string to absolute date (e.g. "June 10, 2026").
 * @param {string|Date} date
 * @param {string} formatStr - Custom format string
 * @returns {string}
 */
export const formatAbsoluteDate = (date, formatStr = 'PPP') => {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, formatStr);
};

/**
 * Formats ISO date string to compact datetime (e.g. "10/06/2026 14:30").
 * @param {string|Date} date
 * @returns {string}
 */
export const formatDateTime = (date) => {
  if (!date) return '';
  const parsedDate = typeof date === 'string' ? parseISO(date) : date;
  return format(parsedDate, 'dd/MM/yyyy HH:mm');
};
