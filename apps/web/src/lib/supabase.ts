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

// Type-safe wrapper for town_data queries
export interface TownDataRecord<T = unknown> {
  id: string;
  type: string;
  index_1: string | null;
  index_2: string | null;
  index_3: string | null;
  data: T;
  created_at: string;
  updated_at: string;
}

export async function queryTownData<T>(
  type: string,
  filters: { index_1?: string; index_2?: string; index_3?: string } = {}
): Promise<TownDataRecord<T>[]> {
  let query = supabase
    .from('town_data')
    .select('*')
    .eq('type', type);

  if (filters.index_1) query = query.eq('index_1', filters.index_1);
  if (filters.index_2) query = query.eq('index_2', filters.index_2);
  if (filters.index_3) query = query.eq('index_3', filters.index_3);

  const { data, error } = await query;

  if (error) throw error;
  return data as TownDataRecord<T>[];
}

export async function getTownDataById<T>(id: string): Promise<TownDataRecord<T> | null> {
  const { data, error } = await supabase
    .from('town_data')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as TownDataRecord<T> | null;
}

// Subscribe to realtime changes on town_data
export function subscribeTownData(
  type: string,
  callback: (payload: { new: TownDataRecord; old: TownDataRecord | null; eventType: string }) => void
) {
  return supabase
    .channel(`town_data:${type}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'town_data',
        filter: `type=eq.${type}`,
      },
      (payload) => {
        callback({
          new: payload.new as TownDataRecord,
          old: payload.old as TownDataRecord | null,
          eventType: payload.eventType,
        });
      }
    )
    .subscribe();
}

// Subscribe to broadcast channels (for streaming tokens, etc.)
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

export async function insertTownData<T>(
  type: string,
  data: T,
  indexes: { index_1?: string; index_2?: string; index_3?: string } = {}
): Promise<TownDataRecord<T>> {
  const { data: record, error } = await supabase
    .from('town_data')
    .insert({
      type,
      data,
      ...indexes,
    })
    .select()
    .single();

  if (error) throw error;
  return record as TownDataRecord<T>;
}
