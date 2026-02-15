'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

export interface CitizenProfile {
  id: string;
  name: string;
  avatar: string;
  email: string;
  bannedUntil: Date | null;
}


export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user);
      }
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (event === 'SIGNED_IN' && session?.user) {
          await loadProfile(session.user);
        } else if (event === 'SIGNED_OUT') {
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = useCallback(async (user: User) => {
    const metadata = user.user_metadata;
    setProfile({
      id: user.id,
      name: metadata.citizen_name || 'Anonymous Crab',
      avatar: metadata.citizen_avatar || 'crab_01',
      email: user.email || '',
      bannedUntil: metadata.banned_until ? new Date(metadata.banned_until) : null,
    });
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    if (!isSupabaseConfigured()) return;
    await supabase.auth.signOut();
  }, []);

  const updateCaptchaTimestamp = useCallback(async (): Promise<void> => {
    if (!isSupabaseConfigured() || !user) return;

    await supabase.auth.updateUser({
      data: { last_captcha_at: new Date().toISOString() },
    });
  }, [user]);

  const getLastCaptchaAt = useCallback((): Date | null => {
    const timestamp = user?.user_metadata?.last_captcha_at;
    return timestamp ? new Date(timestamp) : null;
  }, [user]);

  const needsCaptcha = useCallback((): boolean => {
    const lastCaptcha = getLastCaptchaAt();
    if (!lastCaptcha) return true;
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return lastCaptcha < oneHourAgo;
  }, [getLastCaptchaAt]);

  const deleteAccount = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isSupabaseConfigured() || !session) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch('/api/auth/delete', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        return { success: false, error: data.error || 'Failed to delete account' };
      }

      // Sign out after successful deletion
      await signOut();
      return { success: true };
    } catch (error) {
      return { success: false, error: 'Failed to delete account' };
    }
  }, [session, signOut]);

  return {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated: !!session,
    signOut,
    deleteAccount,
    updateCaptchaTimestamp,
    needsCaptcha,
  };
}
