// ============================================
// Accessible modal dialog with focus management
// ============================================

import React, { useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { IoMdClose } from 'react-icons/io';
import { useLanguage } from '../../i18n/LanguageContext';

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeLabel,
}) => {
  const { t } = useLanguage();
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const generatedId = useId();
  const titleId = title ? `modal-title-${generatedId}` : undefined;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;

    previousFocusRef.current = document.activeElement;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusDialog = window.setTimeout(() => {
      if (dialogRef.current?.contains(document.activeElement)) return;
      const firstFocusable = dialogRef.current?.querySelector(focusableSelector);
      (firstFocusable || dialogRef.current)?.focus();
    }, 0);

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCloseRef.current?.();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll(focusableSelector));
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(focusDialog);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
      const previous = previousFocusRef.current;
      if (previous && typeof previous.focus === 'function') previous.focus();
    };
  }, [isOpen]);

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  const selectedSize = sizeClasses[size] || sizeClasses.md;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4" role="presentation">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden="true"
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-label={title ? undefined : t('common.dialog')}
            tabIndex={-1}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            className={`relative z-10 flex max-h-[90vh] w-full ${selectedSize} flex-col overflow-hidden rounded-2xl border border-surface-200 bg-white shadow-2xl outline-none dark:border-surface-700 dark:bg-surface-800`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-surface-100 px-6 py-4 dark:border-surface-700/50">
              {title && (
                <h2 id={titleId} className="font-display text-lg font-semibold text-surface-900 dark:text-white">
                  {title}
                </h2>
              )}
              <button
                type="button"
                onClick={onClose}
                aria-label={closeLabel || t('common.close')}
                className="ml-auto inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl text-surface-400 transition-colors hover:bg-surface-100 hover:text-surface-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:text-surface-400 dark:hover:bg-surface-700/60 dark:hover:text-white"
              >
                <IoMdClose className="text-xl" aria-hidden="true" />
              </button>
            </div>

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
