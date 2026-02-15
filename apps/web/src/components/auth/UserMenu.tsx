'use client';

import { useState, useEffect } from 'react';

interface UserMenuProps {
  onSignOut: () => void;
  onDeleteAccount: () => Promise<{ success: boolean; error?: string }>;
}

export function UserMenu({ onSignOut, onDeleteAccount }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showDeleteConfirm && !isDeleting) {
        setShowDeleteConfirm(false);
        setIsOpen(false);
        setDeleteError(null);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [showDeleteConfirm, isDeleting]);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(null);

    const result = await onDeleteAccount();

    if (!result.success) {
      setDeleteError(result.error || 'Failed to delete account');
      setIsDeleting(false);
    }
    // On success, user will be signed out automatically
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-1 text-sm text-gray-500 hover:text-gray-700 cursor-pointer leading-none"
        aria-label="Account actions"
      >
        ▼
      </button>

      {isOpen && !showDeleteConfirm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-400 rounded shadow-lg min-w-[150px]">
            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full text-left px-3 py-2 font-retro text-xs hover:bg-gray-100 cursor-pointer whitespace-nowrap"
            >
              🚪 Sign Out
            </button>

            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="w-full text-left px-3 py-2 font-retro text-xs hover:bg-gray-100 cursor-pointer text-red-600 whitespace-nowrap"
            >
              🪦 Revoke Citizenship
            </button>
          </div>
        </>
      )}

      {showDeleteConfirm && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50"
            aria-hidden="true"
            onClick={() => {
              if (!isDeleting) {
                setShowDeleteConfirm(false);
                setIsOpen(false);
                setDeleteError(null);
              }
            }}
          />

          {/* Confirmation Dialog */}
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white border-2 border-gray-400 rounded-lg shadow-xl p-4 w-[300px]"
          >
            <h3 id="delete-dialog-title" className="font-retro text-sm font-bold mb-2">Revoke Your Citizenship?</h3>
            <p className="font-retro text-xs text-gray-600 mb-4">
              This will permanently delete your account.
            </p>

            {deleteError && (
              <p className="font-retro text-xs text-red-600 mb-3">{deleteError}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setIsOpen(false);
                  setDeleteError(null);
                }}
                disabled={isDeleting}
                className="px-3 py-1.5 font-retro text-xs bg-gray-100 hover:bg-gray-200 rounded cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-3 py-1.5 font-retro text-xs bg-red-600 hover:bg-red-700 text-white rounded cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Revoke & Delete'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
