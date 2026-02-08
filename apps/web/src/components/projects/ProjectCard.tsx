'use client';

export interface PullRequest {
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

export type PRStatus = 'open' | 'merged' | 'closed';

interface ProjectCardProps {
  pr: PullRequest;
}

function getPRStatus(pr: PullRequest): PRStatus {
  if (pr.state === 'open') return 'open';
  if (pr.merged) return 'merged';
  return 'closed';
}

const STATUS_COLORS: Record<PRStatus, string> = {
  open: 'bg-green-200 text-green-800',
  merged: 'bg-purple-200 text-purple-800',
  closed: 'bg-red-200 text-red-800',
};

const STATUS_LABELS: Record<PRStatus, string> = {
  open: 'Open',
  merged: 'Merged',
  closed: 'Closed',
};

const STATUS_ICONS: Record<PRStatus, string> = {
  open: '🔄',
  merged: '✅',
  closed: '❌',
};

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

export function ProjectCard({ pr }: ProjectCardProps) {
  const status = getPRStatus(pr);

  return (
    <a
      href={pr.html_url}
      target="_blank"
      rel="noopener noreferrer"
      className="block bg-white border border-gray-300 rounded p-3 hover:border-blue-400 hover:shadow-sm transition-all"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2 gap-2">
        <h3 className="font-retro text-xs font-bold text-gray-800 flex-1 line-clamp-2">
          #{pr.number} {pr.title}
        </h3>
        <span className={`text-[10px] px-2 py-0.5 rounded whitespace-nowrap ${STATUS_COLORS[status]}`}>
          {STATUS_ICONS[status]} {STATUS_LABELS[status]}
        </span>
      </div>

      {/* Labels */}
      {pr.labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {pr.labels.slice(0, 3).map((label) => (
            <span
              key={label.name}
              className="text-[9px] px-1.5 py-0.5 rounded"
              style={{
                backgroundColor: `#${label.color}20`,
                color: `#${label.color}`,
                border: `1px solid #${label.color}40`,
              }}
            >
              {label.name}
            </span>
          ))}
          {pr.labels.length > 3 && (
            <span className="text-[9px] text-gray-400">
              +{pr.labels.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Author and time */}
      <div className="flex items-center gap-2">
        <img
          src={pr.user.avatar_url}
          alt={pr.user.login}
          className="w-4 h-4 rounded-full"
        />
        <span className="font-retro text-[10px] text-gray-500">
          {pr.user.login}
        </span>
        <span className="font-retro text-[10px] text-gray-400">
          · {timeAgo(pr.updated_at)}
        </span>
      </div>
    </a>
  );
}
