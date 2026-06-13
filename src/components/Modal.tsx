/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { ReactNode, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';
import { useOverlayLifecycle } from '../hooks/useOverlayLifecycle';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  contentClassName?: string;
  closeOnOverlay?: boolean;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
  contentClassName,
  closeOnOverlay = true,
}) => {
  const modalRef = useRef<HTMLDivElement | null>(null);
  useOverlayLifecycle({ isOpen, onClose, initialFocusRef: modalRef });
  if (!isOpen) return null;

  const sizeClasses: Record<string, string> = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-5xl',
    full: 'max-w-7xl',
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 pointer-events-none"
      onMouseDown={(event) => {
        if (closeOnOverlay && event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={cn(
          'bg-matte-black-light border border-slate-800 rounded-2xl w-full max-h-[90vh] overflow-hidden pointer-events-auto flex flex-col',
          sizeClasses[size],
          className
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {(title || description) && (
          <div className="p-6 border-b border-slate-800">
            <div className="flex items-start justify-between">
              <div>
                {title && <h2 className="text-2xl font-bold text-gold">{title}</h2>}
                {description && <p className="text-slate-400 mt-1">{description}</p>}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
        <div className={cn('p-6 overflow-y-auto', contentClassName)}>{children}</div>
      </div>
    </div>
  );
};

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}) => {
  const buttonColors: Record<string, string> = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white',
    info: 'bg-gold hover:bg-gold-light text-matte-black',
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <p className="text-slate-400 mb-6">{message}</p>
      <div className="flex gap-3">
        <button
          onClick={onClose}
          disabled={loading}
          className="flex-1 p-3 rounded-xl bg-slate-800 text-slate-300 font-bold disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn('flex-1 p-3 rounded-xl font-bold disabled:opacity-50', buttonColors[variant])}
        >
          {loading ? 'Processing...' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
};

interface FormModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  onSubmit?: () => void;
  submitLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const FormModal: React.FC<FormModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  onSubmit,
  submitLabel = 'Save',
  cancelLabel = 'Cancel',
  loading = false,
  size = 'md',
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size={size}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
      >
        <div className="space-y-4">{children}</div>
        <div className="flex gap-3 pt-6 mt-6 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 p-3 rounded-xl bg-slate-800 text-slate-300 font-bold disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 p-3 rounded-xl bg-gold text-matte-black font-bold disabled:opacity-50"
          >
            {loading ? 'Processing...' : submitLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
};
