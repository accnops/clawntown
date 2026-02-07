'use client';

import { useEffect, useCallback } from 'react';

interface DialogProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
}

export function Dialog({ title, isOpen, onClose, children, className = '' }: DialogProps) {
  // Close on escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className={`window-retro relative w-full max-w-md max-h-[80vh] flex flex-col ${className}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        {/* Title bar */}
        <div className="window-title flex items-center justify-between shrink-0">
          <span id="dialog-title">{title}</span>
          <button
            onClick={onClose}
            className="w-5 h-5 bg-retro-gray border border-t-white border-l-white border-b-gray-600 border-r-gray-600 flex items-center justify-center text-xs font-bold text-gray-800 hover:bg-gray-300 active:border-t-gray-600 active:border-l-gray-600 active:border-b-white active:border-r-white cursor-pointer"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 bg-retro-gray overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}
