'use client';

import { Turnstile } from '@marsidev/react-turnstile';
import { useState } from 'react';

interface CaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export function Captcha({ onVerify, onError, onExpire }: CaptchaProps) {
  const [isLoading, setIsLoading] = useState(true);

  // Dev mode fallback
  if (!SITE_KEY) {
    return (
      <button
        type="button"
        onClick={() => onVerify('dev-token')}
        className="btn-retro px-4 py-2 text-sm"
      >
        [Dev Mode] Skip Captcha
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      {isLoading && (
        <div className="text-sm text-gray-500">Loading verification...</div>
      )}
      <Turnstile
        siteKey={SITE_KEY}
        onSuccess={(token) => {
          setIsLoading(false);
          onVerify(token);
        }}
        onError={() => {
          setIsLoading(false);
          onError?.();
        }}
        onExpire={() => {
          onExpire?.();
        }}
        options={{
          theme: 'light',
          size: 'normal',
        }}
      />
    </div>
  );
}
