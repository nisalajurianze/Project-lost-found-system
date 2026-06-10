// ============================================
// Confirm Dialog Modal Component
// Danger warnings and action validations
// ============================================

import React from 'react';
import Modal from './Modal';
import Button from './Button';
import { FiAlertTriangle } from 'react-icons/fi';

export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmText = 'Delete',
  cancelText = 'Cancel',
  isDanger = true,
  isLoading = false
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col items-center text-center">
        <div className={`p-3 rounded-full mb-4 ${isDanger ? 'bg-red-50 text-red-500 dark:bg-red-950/20' : 'bg-amber-50 text-amber-500 dark:bg-amber-950/20'}`}>
          <FiAlertTriangle className="text-3xl" />
        </div>
        <p className="text-sm text-surface-600 dark:text-surface-300 mb-6">
          {message}
        </p>
        <div className="flex gap-3 w-full">
          <Button
            onClick={onClose}
            variant="ghost"
            className="flex-1"
            disabled={isLoading}
          >
            {cancelText}
          </Button>
          <Button
            onClick={onConfirm}
            variant={isDanger ? 'danger' : 'primary'}
            className="flex-1"
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;

