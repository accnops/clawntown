'use client';

interface Project {
  id: string;
  title: string;
  description: string;
  status: 'proposed' | 'voting' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'failed';
  proposedBy: string;
  votingEndsAt?: Date;
}

interface ProjectCardProps {
  project: Project;
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

export function ProjectCard({ project }: ProjectCardProps) {
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
      <p className="font-retro text-[10px] text-gray-600 mb-2 line-clamp-2">
        {project.description}
      </p>

      {/* Voting deadline */}
      {isVoting && project.votingEndsAt && (
        <p className="font-retro text-[10px] text-yellow-700 mb-2">
          {daysLeft > 0 ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} left` : 'Ending soon'}
        </p>
      )}

      {/* Proposed by */}
      <p className="font-retro text-[10px] text-gray-400">
        Proposed by {project.proposedBy}
      </p>
    </div>
  );
}

export type { Project };
