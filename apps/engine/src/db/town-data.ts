import { supabase } from './client.js';

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

export async function updateTownData<T>(
  id: string,
  data: Partial<T>,
  indexes?: { index_1?: string; index_2?: string; index_3?: string }
): Promise<TownDataRecord<T>> {
  const updatePayload: Record<string, unknown> = { data };
  if (indexes) {
    Object.assign(updatePayload, indexes);
  }

  const { data: record, error } = await supabase
    .from('town_data')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return record as TownDataRecord<T>;
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

export async function deleteTownData(id: string): Promise<void> {
  const { error } = await supabase
    .from('town_data')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
