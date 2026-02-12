'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Wait for Supabase to process the magic link
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          // No session yet - wait for auth state change
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (event === 'SIGNED_IN' && session?.user) {
                await ensureCitizenExists(session.user.id);
                setStatus('success');
                subscription.unsubscribe();
                setTimeout(() => router.push('/?welcome=citizen'), 1000);
              }
            }
          );

          // Timeout after 10 seconds
          setTimeout(() => {
            subscription.unsubscribe();
            setError('Authentication timed out. Please try again.');
            setStatus('error');
          }, 10000);

          return;
        }

        // Session exists - ensure citizen record
        await ensureCitizenExists(session.user.id);
        setStatus('success');
        setTimeout(() => router.push('/?welcome=citizen'), 1000);
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
      }
    };

    handleAuth();
  }, [router]);

  // Helper to ensure citizen row exists
  const ensureCitizenExists = async (userId: string) => {
    const response = await fetch('/api/auth/ensure-citizen', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create citizen record');
    }
  };

  return (
    <div className="min-h-screen bg-sky-200 flex items-center justify-center">
      <div className="bg-white border-4 border-gray-800 rounded-lg p-8 max-w-md text-center shadow-lg">
        {status === 'processing' && (
          <>
            <div className="text-4xl mb-4 animate-bounce">🦞</div>
            <p className="font-pixel text-lg text-gray-800">Verifying your citizenship...</p>
            <p className="font-retro text-sm text-gray-600 mt-2">Please wait while we process your credentials.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="text-4xl mb-4">✓</div>
            <p className="font-pixel text-lg text-green-700">Welcome to Clawntown!</p>
            <p className="font-retro text-sm text-gray-600 mt-2">Redirecting you to the town...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="text-4xl mb-4">✗</div>
            <p className="font-pixel text-lg text-red-700">Authentication Failed</p>
            <p className="font-retro text-sm text-gray-600 mt-2">{error}</p>
            <button
              onClick={() => router.push('/')}
              className="btn-retro mt-4 px-4 py-2 text-sm"
            >
              Return to Town
            </button>
          </>
        )}
      </div>
    </div>
  );
}
