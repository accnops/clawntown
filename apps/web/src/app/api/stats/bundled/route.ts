import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

// Bundled stats endpoint - returns visitors, citizens, and history in one request

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
}

export async function GET(request: NextRequest) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json({
      visitors: 0,
      citizens: 0,
      history: [],
      error: 'Database not configured',
    });
  }

  try {
    // Get optional days parameter for history (default 14)
    const days = Math.min(parseInt(request.nextUrl.searchParams.get('days') || '14', 10), 90);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch all stats in parallel
    const [visitorsResult, citizensResult, historyResult] = await Promise.all([
      // Visitors: count unique visitor hashes
      supabase.from('visitors').select('visitor_hash'),

      // Citizens: count total
      supabase.from('citizens').select('*', { count: 'exact', head: true }),

      // History: last N days
      supabase
        .from('stats_history')
        .select('snapshot_date, contributors, pull_requests, commits, stars, forks, daily_visitors, citizens')
        .gte('snapshot_date', startDate.toISOString().split('T')[0])
        .order('snapshot_date', { ascending: true }),
    ]);

    // Process visitors (count unique hashes)
    const uniqueVisitors = new Set(
      visitorsResult.data?.map(row => row.visitor_hash) || []
    );

    // Process history
    const history = (historyResult.data || []).map(row => ({
      date: row.snapshot_date,
      contributors: row.contributors,
      pullRequests: row.pull_requests,
      commits: row.commits,
      stars: row.stars,
      forks: row.forks || 0,
      visitors: row.daily_visitors,
      citizens: row.citizens || 0,
    }));

    return NextResponse.json({
      visitors: uniqueVisitors.size,
      citizens: citizensResult.count || 0,
      history,
    });
  } catch (error) {
    console.error('Error fetching bundled stats:', error);
    return NextResponse.json({
      visitors: 0,
      citizens: 0,
      history: [],
      error: 'Failed to fetch stats',
    });
  }
}
