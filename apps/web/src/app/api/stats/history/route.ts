import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Returns last 30 days of stats history for sparklines

export async function GET(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Database not configured', history: [] });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Get optional days parameter (default 30)
    const { searchParams } = new URL(request.url);
    const days = Math.min(parseInt(searchParams.get('days') || '30', 10), 90);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('stats_history')
      .select('snapshot_date, contributors, pull_requests, commits, stars, forks, daily_visitors, citizens')
      .gte('snapshot_date', startDate.toISOString().split('T')[0])
      .order('snapshot_date', { ascending: true });

    if (error) throw error;

    // Transform to frontend-friendly format
    const history = (data || []).map(row => ({
      date: row.snapshot_date,
      contributors: row.contributors,
      pullRequests: row.pull_requests,
      commits: row.commits,
      stars: row.stars,
      forks: row.forks || 0,
      visitors: row.daily_visitors,
      citizens: row.citizens || 0,
    }));

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching stats history:', error);
    return NextResponse.json({ error: 'Failed to fetch history', history: [] });
  }
}
