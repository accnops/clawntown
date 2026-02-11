'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import type { CouncilMember, ConversationMessage, CitizenTurn } from '@clawntown/shared';
import { supabase } from '@/lib/supabase';
import { Captcha } from '@/components/auth/Captcha';
import { Dialog } from '@/components/ui/Dialog';
import { ReadyCheckModal } from './ReadyCheckModal';

// Pastel color palette for citizen messages (hashed by citizenId)
const CITIZEN_COLORS = [
  { bg: 'bg-blue-100', border: 'border-blue-300' },
  { bg: 'bg-green-100', border: 'border-green-300' },
  { bg: 'bg-purple-100', border: 'border-purple-300' },
  { bg: 'bg-pink-100', border: 'border-pink-300' },
  { bg: 'bg-yellow-100', border: 'border-yellow-300' },
  { bg: 'bg-orange-100', border: 'border-orange-300' },
  { bg: 'bg-teal-100', border: 'border-teal-300' },
  { bg: 'bg-indigo-100', border: 'border-indigo-300' },
  { bg: 'bg-rose-100', border: 'border-rose-300' },
  { bg: 'bg-cyan-100', border: 'border-cyan-300' },
  { bg: 'bg-lime-100', border: 'border-lime-300' },
  { bg: 'bg-amber-100', border: 'border-amber-300' },
];

// Simple hash function to get consistent color from citizenId
function getCitizenColor(citizenId: string | null): typeof CITIZEN_COLORS[0] {
  if (!citizenId) return CITIZEN_COLORS[0];
  let hash = 0;
  for (let i = 0; i < citizenId.length; i++) {
    hash = ((hash << 5) - hash) + citizenId.charCodeAt(i);
    hash = hash & hash; // Convert to 32-bit integer
  }
  return CITIZEN_COLORS[Math.abs(hash) % CITIZEN_COLORS.length];
}

interface CouncilOfficeProps {
  member: CouncilMember;
  citizenId?: string;
  messages: ConversationMessage[];
  spectatorCount: number;
  queueLength: number;
  queuePosition: number | null; // null if not in queue
  currentTurn: CitizenTurn | null;
  isMyTurn: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  isStreaming: boolean;
  streamingContent: string;
  isJoiningQueue?: boolean;
  onSendMessage: (message: string) => Promise<{ rejected?: boolean; reason?: string } | undefined>;
  onRaiseHand: () => void;
  onLeaveQueue: () => void;
  onEndTurn: () => void;
  onBack: () => void;
  onShowRegistry: () => void;
  needsCaptcha: () => boolean;
  updateCaptchaTimestamp: () => Promise<void>;
}

const CHAR_BUDGET = 500;
const TIME_BUDGET_MS = 20000;
const MESSAGE_LIMIT = 2;

export function CouncilOffice({
  member,
  citizenId,
  messages,
  spectatorCount,
  queueLength,
  queuePosition,
  currentTurn,
  isMyTurn,
  isLoading,
  isAuthenticated,
  isStreaming,
  streamingContent,
  isJoiningQueue = false,
  onSendMessage,
  onRaiseHand,
  onLeaveQueue,
  onEndTurn,
  onBack,
  onShowRegistry,
  needsCaptcha,
  updateCaptchaTimestamp,
}: CouncilOfficeProps) {
  const [input, setInput] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(TIME_BUDGET_MS);
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const [readyCheck, setReadyCheck] = useState<{ expiresAt: Date } | null>(null);
  const [wasNotified, setWasNotified] = useState(false);
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const originalTitleRef = useRef<string>('');

  // Play notification sound
  const playNotificationSound = useCallback(() => {
    try {
      // Create a simple beep using Web Audio API
      const AudioContextClass = window.AudioContext || (window as never as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch {
      // Audio not supported
    }
  }, []);

  // Notify when it's your turn or you're next
  useEffect(() => {
    const shouldNotify = (queuePosition === 0 || isMyTurn) && !wasNotified;

    if (shouldNotify) {
      setWasNotified(true);
      playNotificationSound();

      // Flash title
      if (!originalTitleRef.current) {
        originalTitleRef.current = document.title;
      }

      let flashing = true;
      const flashInterval = setInterval(() => {
        if (document.hidden && flashing) {
          document.title = document.title.includes('🔔')
            ? originalTitleRef.current
            : '🔔 Your turn! - Clawntown';
        }
      }, 1000);

      // Try to show browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Clawntown', {
          body: isMyTurn ? "It's your turn to speak!" : "You're next in line!",
          icon: '/assets/ui/sigil_spin.gif',
        });
      }

      return () => {
        clearInterval(flashInterval);
        if (originalTitleRef.current) {
          document.title = originalTitleRef.current;
        }
      };
    }
  }, [queuePosition, isMyTurn, wasNotified, playNotificationSound]);

  // Reset notification state when leaving queue
  useEffect(() => {
    if (queuePosition === null && !isMyTurn) {
      setWasNotified(false);
    }
  }, [queuePosition, isMyTurn]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Timer countdown when it's my turn
  const turnEndedRef = useRef(false);
  useEffect(() => {
    if (!isMyTurn || !currentTurn || isStreaming) {
      turnEndedRef.current = false;
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Date.now() - currentTurn.startedAt;
      const remaining = Math.max(0, currentTurn.timeBudgetMs - currentTurn.timeUsedMs - elapsed);
      setTimeRemaining(remaining);

      // Auto-end turn when time runs out
      if (remaining === 0 && !turnEndedRef.current) {
        turnEndedRef.current = true;
        onEndTurn();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isMyTurn, currentTurn, isStreaming, onEndTurn]);

  // Subscribe to ready_check events
  useEffect(() => {
    if (!citizenId) return;

    const channel = supabase.channel(`council-member-${member.id}`);

    channel.on('broadcast', { event: 'ready_check' }, (payload) => {
      if (payload.payload?.citizenId === citizenId) {
        setReadyCheck({ expiresAt: new Date(payload.payload.expiresAt) });
      }
    });

    channel.subscribe();
    return () => { channel.unsubscribe(); };
  }, [member.id, citizenId]);

  const handleReadyConfirm = async () => {
    await fetch('/api/queue/ready-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: member.id,
        citizenId,
        action: 'confirm',
      }),
    });
    setReadyCheck(null);
  };

  const handleReadyExpire = () => {
    setReadyCheck(null);
    // User was skipped - could show a toast notification
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const message = input.trim();
    setInput('');
    setRejectionMessage(null);

    const result = await onSendMessage(message);
    if (result?.rejected) {
      setRejectionMessage("Pinched! Try again 🦞");
      setTimeout(() => setRejectionMessage(null), 3000);
    }
  };

  const charsRemaining = currentTurn
    ? currentTurn.charBudget - currentTurn.charsUsed - input.length
    : CHAR_BUDGET - input.length;

  const messagesRemaining = currentTurn
    ? currentTurn.messageLimit - currentTurn.messagesUsed
    : MESSAGE_LIMIT;

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-400">
        <button
          onClick={onBack}
          className="font-retro text-xs text-blue-600 hover:underline cursor-pointer"
        >
          &larr; Lobby
        </button>
        <img
          src={member.avatarSpinning}
          alt={member.name}
          className="w-12 h-12 object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-retro text-sm font-bold truncate">{member.name}</p>
        </div>
        <div className="text-right">
          <p className="font-retro text-[10px] text-gray-500">{spectatorCount} watching</p>
          <p className="font-retro text-[10px] text-gray-500">{queueLength} in queue</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto mb-2 space-y-1 min-h-[200px]">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin text-2xl mb-2">🦀</div>
              <p className="font-retro text-xs text-gray-500">Loading conversation...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="font-retro text-xs text-gray-400 text-center">
              No messages yet.<br />Be the first to speak!
            </p>
          </div>
        ) : messages.map((msg) => {
          const citizenColor = getCitizenColor(msg.citizenId);
          return (
          <div
            key={msg.id}
            className={`flex gap-1.5 ${msg.role === 'citizen' ? 'flex-row-reverse' : ''}`}
          >
            {msg.role === 'council' ? (
              <img
                src={member.avatar}
                alt={member.name}
                className="w-10 h-10 object-contain shrink-0"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : msg.citizenAvatar ? (
              <img
                src={`/assets/citizens/${msg.citizenAvatar}.png`}
                alt={msg.citizenName || 'Citizen'}
                className="w-10 h-10 object-contain shrink-0"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className={`w-10 h-10 ${citizenColor.bg} rounded-full flex items-center justify-center shrink-0`}>
                <span className="text-sm">{msg.citizenName?.charAt(0) || 'C'}</span>
              </div>
            )}
            <div
              className={`rounded px-2 py-1 max-w-[80%] ${
                msg.role === 'council'
                  ? 'bg-white border border-gray-300'
                  : `${citizenColor.bg} border ${citizenColor.border}`
              }`}
            >
              {msg.citizenName && (
                <p className="font-retro text-[10px] text-gray-500">{msg.citizenName}</p>
              )}
              <p className="font-retro text-xs text-gray-700 whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          </div>
        );})}

        {/* Typing indicator while waiting for council response */}
        {isStreaming && (
          <div className="flex gap-1.5">
            <img
              src={member.avatar}
              alt={member.name}
              className="w-10 h-10 object-contain shrink-0"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="bg-white border border-gray-300 rounded px-2 py-1">
              <p className="font-retro text-xs text-gray-500">
                <span className="animate-pulse">Thinking...</span>
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area - always visible for authenticated users */}
      {isAuthenticated ? (
        <div className="space-y-2">
          {/* Turn limits display (only when it's my turn) */}
          {isMyTurn && (
            <div className="flex justify-between text-[10px] font-retro text-gray-500">
              <span>Time: {Math.ceil(timeRemaining / 1000)}s</span>
              <span>{messagesRemaining} msg left</span>
              <span className={charsRemaining < 50 ? 'text-red-500' : ''}>
                {charsRemaining} chars
              </span>
            </div>
          )}

          {/* Queue position indicator */}
          {queuePosition !== null && !isMyTurn && (
            <div className="bg-yellow-100 border border-yellow-400 rounded p-2">
              <p className="font-retro text-xs text-yellow-800 text-center">
                {queuePosition === 0
                  ? "You're next! Get ready..."
                  : `Position in queue: ${queuePosition + 1}`}
              </p>
            </div>
          )}

          {/* Rejection message */}
          {rejectionMessage && (
            <div className="bg-red-50 border border-red-300 rounded px-2 py-1">
              <p className="font-retro text-xs text-red-700 text-center">{rejectionMessage}</p>
            </div>
          )}

          {/* Text input - always visible */}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={isMyTurn ? "Type your message..." : "Prepare your message..."}
            className="input-retro w-full font-retro text-base"
            disabled={isMyTurn && (isStreaming || charsRemaining < 0 || messagesRemaining <= 0)}
            maxLength={currentTurn?.charBudget ?? CHAR_BUDGET}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && isMyTurn && input.trim()) {
                e.preventDefault();
                handleSubmit(e as unknown as React.FormEvent);
              }
            }}
          />

          {/* Action button - changes based on state */}
          {isMyTurn ? (
            <button
              onClick={handleSubmit as unknown as () => void}
              className="btn-retro w-full text-xs"
              disabled={!input.trim() || isStreaming || charsRemaining < 0 || messagesRemaining <= 0}
            >
              Send
            </button>
          ) : queuePosition !== null ? (
            <button onClick={onLeaveQueue} className="btn-retro w-full text-xs">
              Leave Queue
            </button>
          ) : (
            <button
              onClick={() => {
                if (needsCaptcha()) {
                  setShowCaptchaModal(true);
                } else {
                  onRaiseHand();
                }
              }}
              disabled={isJoiningQueue}
              className={`btn-retro w-full text-xs ${isJoiningQueue ? 'opacity-70 cursor-wait' : ''}`}
            >
              {isJoiningQueue ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">~</span>
                  Joining Queue...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <span>✋</span>
                  Raise Hand to Speak
                </span>
              )}
            </button>
          )}
        </div>
      ) : (
        <button
          onClick={onShowRegistry}
          className="btn-retro w-full text-xs"
        >
          Register to Participate
        </button>
      )}

      {/* Captcha Modal */}
      <Dialog
        title="Verification Required"
        isOpen={showCaptchaModal}
        onClose={() => setShowCaptchaModal(false)}
      >
        <p className="mb-4 text-sm font-retro">Please verify you're human to join the queue.</p>
        <Captcha
          onVerify={async (token) => {
            const res = await fetch('/api/captcha/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ token }),
            });
            if (res.ok) {
              await updateCaptchaTimestamp();
              setShowCaptchaModal(false);
              onRaiseHand();
            }
          }}
        />
      </Dialog>

      {/* Ready Check Modal */}
      {readyCheck && (
        <ReadyCheckModal
          expiresAt={readyCheck.expiresAt}
          onConfirm={handleReadyConfirm}
          onExpire={handleReadyExpire}
        />
      )}
    </div>
  );
}
