// ============================================
// Modal Component
// Centered layout card with Framer Motion transition animations
// ============================================

import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IoMdClose } from 'react-icons/io';

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md'
}) => {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className={`relative w-full ${selectedSize} overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-2xl dark:border-surface-700 dark:bg-surface-800 z-10 max-h-[90vh] flex flex-col`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4 dark:border-surface-700/50">
              {title && (
                <h3 className="text-lg font-semibold font-display text-surface-900 dark:text-white">
                  {title}
                </h3>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-surface-500 hover:bg-surface-100 hover:text-surface-700 dark:text-surface-400 dark:hover:bg-surface-700 dark:hover:text-white transition-colors"
              >
                <IoMdClose className="text-xl" />
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
