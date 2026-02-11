'use client';

import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useState, useRef, useImperativeHandle, forwardRef } from 'react';

interface CaptchaProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
}

export interface CaptchaHandle {
  reset: () => void;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

export const Captcha = forwardRef<CaptchaHandle, CaptchaProps>(
  function Captcha({ onVerify, onError, onExpire }, ref) {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);
    const turnstileRef = useRef<TurnstileInstance>(null);

    useImperativeHandle(ref, () => ({
      reset: () => {
        turnstileRef.current?.reset();
        setHasError(false);
        setIsLoading(true);
      },
    }));

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
        {isLoading && !hasError && (
          <div className="text-sm text-gray-500">Loading verification...</div>
        )}
        {hasError && (
          <div className="text-sm text-red-600">
            Verification failed.{' '}
            <button
              type="button"
              onClick={() => {
                turnstileRef.current?.reset();
                setHasError(false);
                setIsLoading(true);
              }}
              className="underline hover:no-underline"
            >
              Try again
            </button>
          </div>
        )}
        <Turnstile
          ref={turnstileRef}
          siteKey={SITE_KEY}
          onSuccess={(token) => {
            setIsLoading(false);
            setHasError(false);
            onVerify(token);
          }}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
            onError?.();
          }}
          onExpire={() => {
            setHasError(true);
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
);
