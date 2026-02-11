import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Check if Supabase is properly configured
export const isSupabaseConfigured = (): boolean => !!(supabaseUrl && supabaseAnonKey);

// Create client only if configured, otherwise create a dummy that won't crash
// Operations will fail gracefully when not configured
export const supabase: SupabaseClient = isSupabaseConfigured()
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('http://localhost:54321', 'dummy-key-for-local-dev');

// Subscribe to broadcast channels
export function subscribeBroadcast<T>(
  channelName: string,
  event: string,
  callback: (payload: T) => void
) {
  return supabase
    .channel(channelName)
    .on('broadcast', { event }, (payload) => {
      callback(payload.payload as T);
    })
    .subscribe();
}
