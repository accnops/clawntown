'use client';

import { useState, useEffect } from 'react';

interface GitHubStats {
  contributors: number;
  pullRequests: number;
  commits: number;
  stars: number;
}

interface HistoryPoint {
  date: string;
  contributors: number;
  pullRequests: number;
  commits: number;
  stars: number;
  visitors: number;
}

interface Stats {
  github: GitHubStats | null;
  visitors: number | null;
  citizens: number | null;
  history: HistoryPoint[];
  loading: boolean;
  error: string | null;
}

export function useStats() {
  const [stats, setStats] = useState<Stats>({
    github: null,
    visitors: null,
    citizens: null,
    history: [],
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch GitHub stats, visitor count, citizen count, and history in parallel
        const [githubRes, visitorsRes, citizensRes, historyRes] = await Promise.all([
          fetch('/api/github/stats'),
          fetch('/api/stats/visitors'),
          fetch('/api/stats/citizens'),
          fetch('/api/stats/history?days=14'),
        ]);

        const githubData = await githubRes.json();
        const visitorsData = await visitorsRes.json();
        const citizensData = await citizensRes.json();
        const historyData = await historyRes.json();

        setStats({
          github: githubRes.ok ? githubData : null,
          visitors: visitorsData.count ?? null,
          citizens: citizensData.count ?? null,
          history: historyData.history || [],
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
