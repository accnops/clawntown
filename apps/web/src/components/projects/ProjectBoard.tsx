'use client';

import { useState } from 'react';
import { ProjectCard, Project } from './ProjectCard';

type FilterStatus = 'all' | 'voting' | 'in_progress' | 'completed';

interface ProjectBoardProps {
  projects: Project[];
}

export function ProjectBoard({ projects }: ProjectBoardProps) {
  const [filter, setFilter] = useState<FilterStatus>('all');

  const filteredProjects = projects.filter((p) => {
    if (filter === 'all') return true;
    if (filter === 'voting') return p.status === 'voting';
    if (filter === 'in_progress') return p.status === 'in_progress';
    if (filter === 'completed') return p.status === 'completed' || p.status === 'failed';
    return true;
  });

  const votingCount = projects.filter((p) => p.status === 'voting').length;
  const activeCount = projects.filter((p) => p.status === 'in_progress').length;

  return (
    <div className="flex flex-col h-full">
      {/* Header stats */}
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-400">
        <div className="flex gap-3">
          <span className="font-retro text-[10px] text-gray-600">
            🗳️ {votingCount} voting
          </span>
          <span className="font-retro text-[10px] text-gray-600">
            🏗️ {activeCount} active
          </span>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {(['all', 'voting', 'in_progress', 'completed'] as FilterStatus[]).map((status) => (
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
            {status === 'voting' && '🗳️ Voting'}
            {status === 'in_progress' && '🏗️ Active'}
            {status === 'completed' && '✅ Done'}
          </button>
        ))}
      </div>

      {/* Project list */}
      <div className="flex-1 overflow-y-auto space-y-3">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-8">
            <p className="font-retro text-xs text-gray-500">
              No projects found
            </p>
            <p className="font-retro text-[10px] text-gray-400 mt-1">
              Visit Town Hall to propose new ideas!
            </p>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
            />
          ))
        )}
      </div>
    </div>
  );
}
