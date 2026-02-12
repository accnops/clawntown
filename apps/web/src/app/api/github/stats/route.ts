import { NextResponse } from 'next/server';

// Cache the stats for 5 minutes to avoid hitting GitHub rate limits
let cachedStats: GitHubStats | null = null;
let cacheTime: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface GitHubStats {
  contributors: number;
  pullRequests: number;
  commits: number;
  stars: number;
  forks: number;
}

const REPO_OWNER = 'accnops';
const REPO_NAME = 'clawntown';

async function fetchGitHubStats(): Promise<GitHubStats> {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'Clawntown-Stats',
  };

  // Add auth token if available (increases rate limit from 60 to 5000 req/hour)
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const baseUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

  // Fetch all stats in parallel
  const [repoRes, contributorsRes, pullsRes, commitsRes] = await Promise.all([
    fetch(baseUrl, { headers, next: { revalidate: 300 } }),
    fetch(`${baseUrl}/contributors?per_page=1`, { headers, next: { revalidate: 300 } }),
    fetch(`${baseUrl}/pulls?state=all&per_page=1`, { headers, next: { revalidate: 300 } }),
    fetch(`${baseUrl}/commits?per_page=1`, { headers, next: { revalidate: 300 } }),
  ]);

  // Get stars and forks from repo info
  const repoData = await repoRes.json();
  const stars = repoData.stargazers_count || 0;
  const forks = repoData.forks_count || 0;

  // Get total counts from Link headers (pagination info)
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

// Parse the Link header to get total count from last page
function getCountFromLinkHeader(linkHeader: string | null): number | null {
  if (!linkHeader) return null;

  // Link header format: <url?page=X>; rel="last"
  const lastMatch = linkHeader.match(/<[^>]+[?&]page=(\d+)[^>]*>;\s*rel="last"/);
  if (lastMatch) {
    return parseInt(lastMatch[1], 10);
  }
  return null;
}

export async function GET() {
  try {
    const now = Date.now();

    // Return cached stats if still valid
    if (cachedStats && (now - cacheTime) < CACHE_DURATION) {
      return NextResponse.json(cachedStats);
    }

    const stats = await fetchGitHubStats();

    // Update cache
    cachedStats = stats;
    cacheTime = now;

    return NextResponse.json(stats);
  } catch (error) {
    console.error('Error fetching GitHub stats:', error);

    // Return cached stats if available, even if stale
    if (cachedStats) {
      return NextResponse.json(cachedStats);
    }

    return NextResponse.json(
      { error: 'Failed to fetch GitHub stats' },
      { status: 500 }
    );
  }
}
