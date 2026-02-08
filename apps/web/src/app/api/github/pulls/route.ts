import { NextResponse } from 'next/server';

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  merged: boolean;
  user: {
    login: string;
    avatar_url: string;
  };
  created_at: string;
  updated_at: string;
  merged_at: string | null;
  html_url: string;
  labels: Array<{
    name: string;
    color: string;
  }>;
}

const REPO_OWNER = 'accnops';
const REPO_NAME = 'clawntown';

export async function GET() {
  try {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'User-Agent': 'Clawntown-MoltCenter',
    };

    if (process.env.GITHUB_TOKEN) {
      headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const baseUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`;

    // Fetch open and closed PRs (last 30 of each)
    const [openRes, closedRes] = await Promise.all([
      fetch(`${baseUrl}/pulls?state=open&per_page=30&sort=updated&direction=desc`, {
        headers,
        next: { revalidate: 60 }, // Cache for 1 minute
      }),
      fetch(`${baseUrl}/pulls?state=closed&per_page=30&sort=updated&direction=desc`, {
        headers,
        next: { revalidate: 60 },
      }),
    ]);

    if (!openRes.ok || !closedRes.ok) {
      throw new Error('Failed to fetch PRs from GitHub');
    }

    const openPRs: GitHubPullRequest[] = await openRes.json();
    const closedPRs: GitHubPullRequest[] = await closedRes.json();

    // Mark merged PRs (closed PRs with merged_at set)
    const allPRs = [
      ...openPRs.map(pr => ({ ...pr, merged: false })),
      ...closedPRs.map(pr => ({ ...pr, merged: pr.merged_at !== null })),
    ];

    // Sort by updated_at descending
    allPRs.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

    return NextResponse.json({ pulls: allPRs });
  } catch (error) {
    console.error('Error fetching GitHub PRs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch pull requests', pulls: [] },
      { status: 500 }
    );
  }
}
