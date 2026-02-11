'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const params = useParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        // Get name and avatar from path params: /auth/callback/[name]/[avatar]
        const pathParams = params.params as string[] | undefined;
        const name = pathParams?.[0] ? decodeURIComponent(pathParams[0]) : null;
        const avatar = pathParams?.[1] ? decodeURIComponent(pathParams[1]) : null;

        // Supabase client automatically picks up the hash fragment
        // and exchanges it for a session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!session) {
          // No session yet - wait for Supabase to process the hash
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              if (event === 'SIGNED_IN' && session?.user) {
                // Update user metadata if this is a new registration
                if (name && avatar) {
                  await supabase.auth.updateUser({
                    data: {
                      citizen_name: name,
                      citizen_avatar: avatar,
                      last_captcha_at: new Date().toISOString(),
                      violation_count: 0,
                      banned_until: null,
                    },
                  });
                }

                setStatus('success');
                subscription.unsubscribe();

                // Redirect to home and open town hall
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

        // Session exists - update metadata if needed
        if (name && avatar && session.user) {
          await supabase.auth.updateUser({
            data: {
              citizen_name: name,
              citizen_avatar: avatar,
              last_captcha_at: new Date().toISOString(),
              violation_count: 0,
              banned_until: null,
            },
          });
        }

        setStatus('success');
        setTimeout(() => router.push('/?welcome=citizen'), 1000);
      } catch (err) {
        console.error('Auth callback error:', err);
        setError(err instanceof Error ? err.message : 'Authentication failed');
        setStatus('error');
      }
    };

    handleAuth();
  }, [router, params]);

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
