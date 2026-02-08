'use client';

import { useState, useEffect } from 'react';
import { ProjectCard, PullRequest, PRStatus } from './ProjectCard';

type FilterStatus = 'all' | 'open' | 'merged' | 'closed';

function getPRStatus(pr: PullRequest): PRStatus {
  if (pr.state === 'open') return 'open';
  if (pr.merged) return 'merged';
  return 'closed';
}

export function ProjectBoard() {
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [pulls, setPulls] = useState<PullRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPRs() {
      try {
        const res = await fetch('/api/github/pulls');
        const data = await res.json();
        if (data.pulls) {
          setPulls(data.pulls);
        } else {
          setError('Failed to load pull requests');
        }
      } catch (err) {
        setError('Failed to load pull requests');
      } finally {
        setLoading(false);
      }
    }
    fetchPRs();
  }, []);

  const filteredPulls = pulls.filter((pr) => {
    if (filter === 'all') return true;
    return getPRStatus(pr) === filter;
  });

  const openCount = pulls.filter((pr) => getPRStatus(pr) === 'open').length;
  const mergedCount = pulls.filter((pr) => getPRStatus(pr) === 'merged').length;
  const closedCount = pulls.filter((pr) => getPRStatus(pr) === 'closed').length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="font-retro text-xs text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header stats */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-400">
        <div className="flex gap-3">
          <span className="font-retro text-[10px] text-gray-600">
            🔄 {openCount} open
          </span>
          <span className="font-retro text-[10px] text-gray-600">
            ✅ {mergedCount} merged
          </span>
          {closedCount > 0 && (
            <span className="font-retro text-[10px] text-gray-600">
              ❌ {closedCount} closed
            </span>
          )}
        </div>
        <a
          href="https://github.com/accnops/clawntown/pulls"
          target="_blank"
          rel="noopener noreferrer"
          className="font-retro text-[10px] text-blue-600 hover:text-blue-800 hover:underline"
        >
          View on GitHub →
        </a>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {(['all', 'open', 'merged', 'closed'] as FilterStatus[]).map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-2 py-1 font-retro text-[10px] rounded whitespace-nowrap cursor-pointer ${
              filter === status
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {status === 'all' && 'All'}
            {status === 'open' && '🔄 Open'}
            {status === 'merged' && '✅ Merged'}
            {status === 'closed' && '❌ Closed'}
          </button>
        ))}
      </div>

      {/* Pull request list */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {filteredPulls.length === 0 ? (
          <div className="text-center py-8">
            <p className="font-retro text-xs text-gray-500">
              No pull requests found
            </p>
            <p className="font-retro text-[10px] text-gray-400 mt-1">
              {filter === 'all'
                ? 'Be the first to contribute!'
                : `No ${filter} pull requests`}
            </p>
          </div>
        ) : (
          filteredPulls.map((pr) => (
            <ProjectCard key={pr.id} pr={pr} />
          ))
        )}
      </div>
    </div>
  );
}
