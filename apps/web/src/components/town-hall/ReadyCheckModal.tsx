'use client';

import { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';

interface ReadyCheckModalProps {
  expiresAt: Date;
  onConfirm: () => Promise<void>;
  onExpire: () => void;
}

export function ReadyCheckModal({ expiresAt, onConfirm, onExpire }: ReadyCheckModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [isConfirming, setIsConfirming] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining === 0) {
        clearInterval(interval);
        onExpire();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire]);

  const handleConfirm = async () => {
    setIsConfirming(true);
    await onConfirm();
  };

  return (
    <Dialog title="You're Next!" isOpen={true} onClose={() => {}}>
      <div className="flex flex-col items-center gap-4 p-4">
        <div className="text-6xl">🦀</div>
        <p className="text-center">
          You're next in line! Confirm you're ready to speak with the council member.
        </p>

        <div className="text-2xl font-bold text-red-600">
          {secondsLeft}s
        </div>

        <div className="w-full bg-gray-200 h-2 rounded overflow-hidden">
          <div
            className="bg-blue-500 h-full transition-all duration-1000"
            style={{ width: `${(secondsLeft / 30) * 100}%` }}
          />
        </div>

        <button
          onClick={handleConfirm}
          disabled={isConfirming}
          className="btn-retro px-6 py-3 text-lg w-full"
        >
          {isConfirming ? 'Confirming...' : "I'm Ready!"}
        </button>

        <p className="text-xs text-gray-500">
          If you don't confirm, you'll be skipped.
        </p>
      </div>
    </Dialog>
  );
}
