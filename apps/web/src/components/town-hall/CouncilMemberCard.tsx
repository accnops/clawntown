'use client';

import type { CouncilMember } from '@clawntown/shared';

interface CouncilMemberCardProps {
  member: CouncilMember;
  isOnline: boolean;
  spectatorCount?: number;
  queueLength?: number;
  onClick: () => void;
}

export function CouncilMemberCard({
  member,
  isOnline,
  spectatorCount = 0,
  queueLength = 0,
  onClick,
}: CouncilMemberCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative p-3 rounded border-2 transition-all text-left w-full
        ${isOnline
          ? 'bg-white border-green-400 hover:border-green-600 hover:shadow-md cursor-pointer'
          : 'bg-gray-100 border-gray-300 opacity-60'
        }
      `}
      disabled={!isOnline}
    >
      {/* Online indicator */}
      <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />

      {/* Avatar */}
      <div className="flex justify-center mb-2">
        <img
          src={member.avatar}
          alt={member.name}
          className="w-16 h-16 object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Name and role */}
      <p className="font-retro text-xs font-bold text-center truncate">{member.name}</p>
      <p className="font-retro text-[10px] text-gray-600 text-center capitalize">
        {member.role.replace('_', ' ')}
      </p>

      {/* Status */}
      {isOnline ? (
        <div className="mt-2 space-y-1">
          {spectatorCount > 0 && (
            <p className="font-retro text-[10px] text-gray-500 text-center">
              {spectatorCount} watching
            </p>
          )}
          {queueLength > 0 && (
            <p className="font-retro text-[10px] text-yellow-700 text-center">
              {queueLength} in queue
            </p>
          )}
        </div>
      ) : (
        <p className="font-retro text-[10px] text-gray-500 text-center mt-2">
          Offline
        </p>
      )}
    </button>
  );
}
