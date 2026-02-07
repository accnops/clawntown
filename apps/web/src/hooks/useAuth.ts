'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface CitizenProfile {
  id: string;
  name: string;
  avatar: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    // Subscribe to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Sign up with email and password
  const signUp = useCallback(async (email: string, password: string, citizenName: string, avatarId: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          citizen_name: citizenName,
          citizen_avatar: avatarId,
        },
      },
    });

    if (error) throw error;
    return data;
  }, []);

  // Sign in with email and password
  const signIn = useCallback(async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  }, []);

  // Get citizen display name and avatar
  const citizenName = profile?.name || user?.user_metadata?.citizen_name || 'Anonymous';
  const citizenAvatar = profile?.avatar || user?.user_metadata?.citizen_avatar || 'citizen_01';

  return {
    user,
    session,
    profile,
    isLoading,
    isAuthenticated: !!user,
    citizenName,
    citizenAvatar,
    signUp,
    signIn,
    signOut,
  };
}
