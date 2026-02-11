'use client';

import { useState } from 'react';
import type { CouncilMember } from '@clawntown/shared';
import { useCouncilOffice, useAuth } from '@/hooks';
import { CouncilOffice } from './CouncilOffice';

interface CitizenProfile {
  id: string;
  name: string;
  avatar: string;
  email: string;
  bannedUntil: Date | null;
}

interface CouncilOfficeViewProps {
  member: CouncilMember;
  profile: CitizenProfile | null;
  isAuthenticated: boolean;
  onBack: () => void;
  onShowRegistry: () => void;
}

export function CouncilOfficeView({
  member,
  profile,
  isAuthenticated,
  onBack,
  onShowRegistry,
}: CouncilOfficeViewProps) {
  const { needsCaptcha, updateCaptchaTimestamp } = useAuth();
  const [isJoiningQueue, setIsJoiningQueue] = useState(false);

  const {
    messages,
    queueLength,
    queuePosition,
    currentTurn,
    isMyTurn,
    isLoading,
    spectatorCount,
    isStreaming,
    streamingContent,
    raiseHand,
    leaveQueue,
    sendMessage,
    endTurn,
  } = useCouncilOffice({
    member,
    citizenId: profile?.id,
  });

  const handleRaiseHand = async () => {
    if (!profile) return;
    setIsJoiningQueue(true);
    try {
      await raiseHand(profile.name, profile.avatar);
    } finally {
      setIsJoiningQueue(false);
    }
  };

  const handleSendMessage = async (content: string) => {
    return await sendMessage(content, profile?.name, profile?.avatar);
  };

  // Show guest view if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="space-y-4">
        <button
          onClick={onBack}
          className="font-retro text-xs text-blue-600 hover:underline"
        >
          &larr; Back to Lobby
        </button>
        <div className="text-center py-8">
          <img
            src={member.avatar}
            alt={member.name}
            className="w-16 h-16 mx-auto mb-3"
            style={{ imageRendering: 'pixelated' }}
          />
          <h3 className="font-retro text-sm font-bold mb-2">
            {member.name}
          </h3>
          <p className="font-retro text-xs text-gray-600 mb-4">
            Become a citizen to chat with the council!
          </p>
          <button
            onClick={onShowRegistry}
            className="btn-retro"
          >
            Become a Citizen
          </button>
        </div>
      </div>
    );
  }

  return (
    <CouncilOffice
      member={member}
      citizenId={profile?.id}
      messages={messages}
      spectatorCount={spectatorCount}
      queueLength={queueLength}
      queuePosition={queuePosition}
      currentTurn={currentTurn}
      isMyTurn={isMyTurn}
      isLoading={isLoading}
      isAuthenticated={isAuthenticated}
      isStreaming={isStreaming}
      streamingContent={streamingContent}
      isJoiningQueue={isJoiningQueue}
      onSendMessage={handleSendMessage}
      onRaiseHand={handleRaiseHand}
      onLeaveQueue={leaveQueue}
      onEndTurn={endTurn}
      onBack={onBack}
      onShowRegistry={onShowRegistry}
      needsCaptcha={needsCaptcha}
      updateCaptchaTimestamp={updateCaptchaTimestamp}
    />
  );
}
