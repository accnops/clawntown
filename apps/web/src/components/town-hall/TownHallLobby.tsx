'use client';

import { useState, useEffect } from 'react';
import { COUNCIL_MEMBERS, isCouncilMemberOnline } from '@/data/council-members';
import { CouncilMemberCard } from './CouncilMemberCard';
import type { CouncilMember } from '@clawntown/shared';

interface TownHallLobbyProps {
  onSelectMember: (member: CouncilMember) => void;
  onOpenRegistry: () => void;
  isAuthenticated: boolean;
  citizenName?: string;
  onSignOut?: () => void;
}

export function TownHallLobby({
  onSelectMember,
  onOpenRegistry,
  isAuthenticated,
  citizenName,
  onSignOut,
}: TownHallLobbyProps) {
  const [now, setNow] = useState(new Date());

  // Update time every minute to refresh online status
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const onlineMembers = COUNCIL_MEMBERS.filter(m => isCouncilMemberOnline(m, now));
  const offlineMembers = COUNCIL_MEMBERS.filter(m => !isCouncilMemberOnline(m, now));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-pixel text-sm text-lobster-red mb-1">Town Hall</h2>
        <p className="font-retro text-xs text-gray-600">
          {onlineMembers.length} council member{onlineMembers.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Auth Section */}
      {isAuthenticated ? (
        <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded p-2">
          <span className="font-retro text-xs text-green-800">
            🦀 Welcome, {citizenName}!
          </span>
          <button
            onClick={onSignOut}
            className="font-retro text-xs text-green-600 hover:underline"
          >
            Sign Out
          </button>
        </div>
      ) : (
        <button
          onClick={onOpenRegistry}
          className="btn-retro w-full text-sm py-3"
        >
          🦞 Become a Citizen to Chat
        </button>
      )}

      {/* Online members */}
      {onlineMembers.length > 0 && (
        <div>
          <p className="font-retro text-xs font-bold text-green-700 mb-2">Available Now</p>
          <div className="grid grid-cols-2 gap-2">
            {onlineMembers.map(member => (
              <CouncilMemberCard
                key={member.id}
                member={member}
                isOnline={true}
                onClick={() => onSelectMember(member)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Offline members */}
      {offlineMembers.length > 0 && (
        <div>
          <p className="font-retro text-xs font-bold text-gray-500 mb-2">Currently Offline</p>
          <div className="grid grid-cols-2 gap-2">
            {offlineMembers.map(member => (
              <CouncilMemberCard
                key={member.id}
                member={member}
                isOnline={false}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
