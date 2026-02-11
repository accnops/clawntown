import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ count: 0, error: 'Database not configured' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { count, error } = await supabase
      .from('citizens')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Error fetching citizen count:', error);
    return NextResponse.json({ count: 0 });
  }
}
