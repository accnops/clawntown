'use client';

import { useState } from 'react';

interface UserMenuProps {
  citizenName: string;
  onSignOut: () => void;
}

export function UserMenu({ citizenName, onSignOut }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-white/90 border border-gray-400 rounded px-2 py-1 hover:bg-white"
      >
        <span className="w-6 h-6 bg-blue-500 rounded flex items-center justify-center text-xs text-white">
          👤
        </span>
        <span className="font-retro text-[10px] text-gray-800 max-w-[100px] truncate">
          {citizenName}
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-400 rounded shadow-lg min-w-[150px]">
            <div className="px-3 py-2 border-b border-gray-200">
              <p className="font-retro text-xs font-bold truncate">{citizenName}</p>
              <p className="font-retro text-[10px] text-gray-500">Citizen of Clawntown</p>
            </div>

            <button
              onClick={() => {
                setIsOpen(false);
                onSignOut();
              }}
              className="w-full text-left px-3 py-2 font-retro text-xs hover:bg-gray-100"
            >
              🚪 Sign Out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
