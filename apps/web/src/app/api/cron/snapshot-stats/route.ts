import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint is called by Vercel Cron to snapshot daily stats
// Configured in vercel.json

const REPO_OWNER = 'accnops';
const REPO_NAME = 'clawntown';

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this header for cron jobs)
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Also allow in development without secret
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // Fetch current GitHub stats
    const githubStats = await fetchGitHubStats();

    // Get today's visitor count
    const today = new Date().toISOString().split('T')[0];
    const { count: dailyVisitors } = await supabase
      .from('visitors')
      .select('*', { count: 'exact', head: true })
      .eq('visit_date', today);

    // Get citizen count
    const { count: citizenCount } = await supabase
      .from('citizens')
      .select('*', { count: 'exact', head: true });

    // Upsert today's snapshot
    const { error } = await supabase
      .from('stats_history')
      .upsert({
        snapshot_date: today,
        contributors: githubStats.contributors,
        pull_requests: githubStats.pullRequests,
        commits: githubStats.commits,
        stars: githubStats.stars,
        forks: githubStats.forks,
        daily_visitors: dailyVisitors || 0,
        citizens: citizenCount || 0,
      }, {
        onConflict: 'snapshot_date',
      });

    if (error) throw error;

    // Cleanup old rate limit entries (non-blocking)
    try {
      await supabase.rpc('cleanup_rate_limits');
    } catch (cleanupError) {
      console.error('Rate limit cleanup failed:', cleanupError);
    }

    return NextResponse.json({
      success: true,
      date: today,
      stats: {
        ...githubStats,
        dailyVisitors: dailyVisitors || 0,
        citizens: citizenCount || 0,
      },
    });
  } catch (error) {
    console.error('Error snapshotting stats:', error);
    return NextResponse.json({ error: 'Failed to snapshot stats' }, { status: 500 });
  }
}

async function fetchGitHubStats() {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Clawntown-Stats',
  };

  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const baseUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

  const [repoRes, contributorsRes, pullsRes, commitsRes] = await Promise.all([
    fetch(baseUrl, { headers }),
    fetch(`${baseUrl}/contributors?per_page=1`, { headers }),
    fetch(`${baseUrl}/pulls?state=all&per_page=1`, { headers }),
    fetch(`${baseUrl}/commits?per_page=1`, { headers }),
  ]);

  const repoData = await repoRes.json();
  const stars = repoData.stargazers_count || 0;
  const forks = repoData.forks_count || 0;

  const contributorCount = getCountFromLinkHeader(contributorsRes.headers.get('Link')) ||
    (await contributorsRes.json()).length || 0;
  const pullCount = getCountFromLinkHeader(pullsRes.headers.get('Link')) ||
    (await pullsRes.json()).length || 0;
  const commitCount = getCountFromLinkHeader(commitsRes.headers.get('Link')) ||
    (await commitsRes.json()).length || 0;

  return {
    contributors: contributorCount,
    pullRequests: pullCount,
    commits: commitCount,
    stars,
    forks,
  };
}

function getCountFromLinkHeader(linkHeader: string | null): number | null {
  if (!linkHeader) return null;
  const lastMatch = linkHeader.match(/<[^>]+[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  if (lastMatch) {
    return parseInt(lastMatch[1], 10);
  }
  return null;
}
