'use client';

interface Project {
  id: string;
  title: string;
  description: string;
  status: 'proposed' | 'voting' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'failed';
  proposedBy: string;
  supportVotes: number;
  opposeVotes: number;
  supportBribes: number;
  opposeBribes: number;
  votingEndsAt?: Date;
}

interface ProjectCardProps {
  project: Project;
  onVote?: (projectId: string, vote: 'support' | 'oppose') => void;
  onBribe?: (projectId: string, vote: 'support' | 'oppose', amount: number) => void;
  userVote?: 'support' | 'oppose' | null;
}

const STATUS_COLORS: Record<Project['status'], string> = {
  proposed: 'bg-blue-200 text-blue-800',
  voting: 'bg-yellow-200 text-yellow-800',
  approved: 'bg-green-200 text-green-800',
  rejected: 'bg-red-200 text-red-800',
  in_progress: 'bg-purple-200 text-purple-800',
  completed: 'bg-green-300 text-green-900',
  failed: 'bg-gray-200 text-gray-800',
};

const STATUS_LABELS: Record<Project['status'], string> = {
  proposed: 'Proposed',
  voting: 'Voting',
  approved: 'Approved',
  rejected: 'Rejected',
  in_progress: 'Building',
  completed: 'Complete',
  failed: 'Failed',
};

export function ProjectCard({ project, onVote, onBribe, userVote }: ProjectCardProps) {
  const totalVotes = project.supportVotes + project.opposeVotes;
  const supportPercent = totalVotes > 0 ? (project.supportVotes / totalVotes) * 100 : 50;
  const isVoting = project.status === 'voting';

  const timeLeft = project.votingEndsAt
    ? Math.max(0, new Date(project.votingEndsAt).getTime() - Date.now())
    : 0;
  const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));

  return (
    <div className="bg-white border border-gray-300 rounded p-3">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-retro text-xs font-bold text-gray-800 flex-1">
          {project.title}
        </h3>
        <span className={`text-[10px] px-2 py-0.5 rounded ${STATUS_COLORS[project.status]}`}>
          {STATUS_LABELS[project.status]}
        </span>
      </div>

      {/* Description */}
      <p className="font-retro text-[10px] text-gray-600 mb-3 line-clamp-2">
        {project.description}
      </p>

      {/* Vote bar */}
      {(isVoting || project.status === 'approved' || project.status === 'rejected') && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] font-retro mb-1">
            <span className="text-green-700">👍 {project.supportVotes}</span>
            <span className="text-red-700">👎 {project.opposeVotes}</span>
          </div>
          <div className="h-2 bg-red-200 rounded overflow-hidden">
            <div
              className="h-full bg-green-400 transition-all"
              style={{ width: `${supportPercent}%` }}
            />
          </div>
          {isVoting && project.votingEndsAt && (
            <p className="font-retro text-[10px] text-gray-500 mt-1 text-center">
              {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : 'Ending soon'}
            </p>
          )}
        </div>
      )}

      {/* Bribe totals */}
      {(project.supportBribes > 0 || project.opposeBribes > 0) && (
        <div className="flex justify-between text-[10px] font-retro mb-3 px-2 py-1 bg-yellow-50 rounded">
          <span className="text-yellow-700">💰 Support: {project.supportBribes}</span>
          <span className="text-yellow-700">💰 Oppose: {project.opposeBribes}</span>
        </div>
      )}

      {/* Voting buttons */}
      {isVoting && onVote && (
        <div className="flex gap-2">
          <button
            onClick={() => onVote(project.id, 'support')}
            className={`flex-1 btn-retro text-[10px] py-1 ${
              userVote === 'support' ? 'bg-green-200 border-green-400' : ''
            }`}
          >
            👍 Support
          </button>
          <button
            onClick={() => onVote(project.id, 'oppose')}
            className={`flex-1 btn-retro text-[10px] py-1 ${
              userVote === 'oppose' ? 'bg-red-200 border-red-400' : ''
            }`}
          >
            👎 Oppose
          </button>
        </div>
      )}

      {/* Proposed by */}
      <p className="font-retro text-[10px] text-gray-400 mt-2">
        Proposed by {project.proposedBy}
      </p>
    </div>
  );
}

export type { Project };
