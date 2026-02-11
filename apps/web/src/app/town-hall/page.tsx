'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

/**
 * Town Hall redirect page - handles Supabase magic link auth redirects
 * that come to /town-hall#access_token=...
 *
 * The hash fragment contains the auth token which Supabase client
 * automatically processes.
 */
export default function TownHallPage() {
  const router = useRouter();

  useEffect(() => {
    // Supabase client automatically processes hash fragment tokens
    // We just need to wait for auth state to update, then redirect
    const checkAuth = async () => {
      // Give Supabase a moment to process the hash
      await new Promise(resolve => setTimeout(resolve, 500));

      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Authenticated - go to main page and open town hall
        router.replace('/?welcome=citizen');
      } else {
        // Listen for auth changes (in case token is still processing)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, session) => {
            if (event === 'SIGNED_IN' && session) {
              subscription.unsubscribe();
              router.replace('/?welcome=citizen');
            }
          }
        );

        // Timeout - redirect anyway after 5 seconds
        setTimeout(() => {
          subscription.unsubscribe();
          router.replace('/?welcome=citizen');
        }, 5000);
      }
    };

    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-sky-200 flex items-center justify-center">
      <div className="bg-white border-4 border-gray-800 rounded-lg p-8 max-w-md text-center shadow-lg">
        <div className="text-4xl mb-4 animate-bounce">🦞</div>
        <p className="font-pixel text-lg text-gray-800">Welcome to Clawntown!</p>
        <p className="font-retro text-sm text-gray-600 mt-2">Taking you to the town square...</p>
      </div>
    </div>
  );
}
