'use client';

import { useState, useEffect } from 'react';

interface GitHubStats {
  contributors: number;
  pullRequests: number;
  commits: number;
  stars: number;
}

interface Stats {
  github: GitHubStats | null;
  visitors: number | null;
  loading: boolean;
  error: string | null;
}

export function useStats() {
  const [stats, setStats] = useState<Stats>({
    github: null,
    visitors: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch GitHub stats and visitor count in parallel
        const [githubRes, visitorsRes] = await Promise.all([
          fetch('/api/github/stats'),
          fetch('/api/stats/visitors'),
        ]);

        const githubData = await githubRes.json();
        const visitorsData = await visitorsRes.json();

        setStats({
          github: githubRes.ok ? githubData : null,
          visitors: visitorsData.count ?? null,
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats(prev => ({
          ...prev,
          loading: false,
          error: 'Failed to fetch stats',
        }));
      }
    }

    fetchStats();
  }, []);

  return stats;
}

// Hook to track a page visit (call once on page load)
export function useTrackVisit() {
  useEffect(() => {
    // Track visit on mount
    fetch('/api/stats/visitors', { method: 'POST' }).catch(() => {
      // Silently fail - visitor tracking is non-essential
    });
  }, []);
}
