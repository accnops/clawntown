'use client';

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

  const {
    messages,
    chatState,
    queueLength,
    queuePosition,
    spectatorCount,
    isLoading,
    canSend,
    isQueued,
    isMyTurn,
    isSending,
    pendingContent,
    turnExpiresAt,
    sendMessage,
    leaveQueue,
  } = useCouncilOffice({
    member,
    citizenId: profile?.id,
    citizenName: profile?.name,
    citizenAvatar: profile?.avatar,
  });

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
      chatState={chatState}
      spectatorCount={spectatorCount}
      queueLength={queueLength}
      queuePosition={queuePosition}
      isMyTurn={isMyTurn}
      isQueued={isQueued}
      isSending={isSending}
      canSend={canSend}
      pendingContent={pendingContent}
      turnExpiresAt={turnExpiresAt}
      isLoading={isLoading}
      isAuthenticated={isAuthenticated}
      onSendMessage={sendMessage}
      onLeaveQueue={leaveQueue}
      onBack={onBack}
      onShowRegistry={onShowRegistry}
      needsCaptcha={needsCaptcha}
      updateCaptchaTimestamp={updateCaptchaTimestamp}
    />
  );
}
