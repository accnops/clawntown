'use client';

import { useState, useRef, useEffect } from 'react';
import type { CouncilMember, ConversationMessage, CitizenTurn } from '@clawntown/shared';
import { Captcha } from '@/components/auth/Captcha';
import { Dialog } from '@/components/ui/Dialog';

interface CouncilOfficeProps {
  member: CouncilMember;
  messages: ConversationMessage[];
  spectatorCount: number;
  queueLength: number;
  queuePosition: number | null; // null if not in queue
  currentTurn: CitizenTurn | null;
  isMyTurn: boolean;
  isAuthenticated: boolean;
  isStreaming: boolean;
  streamingContent: string;
  onSendMessage: (message: string) => void;
  onRaiseHand: () => void;
  onLeaveQueue: () => void;
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
  messages,
  spectatorCount,
  queueLength,
  queuePosition,
  currentTurn,
  isMyTurn,
  isAuthenticated,
  isStreaming,
  streamingContent,
  onSendMessage,
  onRaiseHand,
  onLeaveQueue,
  onBack,
  onShowRegistry,
  needsCaptcha,
  updateCaptchaTimestamp,
}: CouncilOfficeProps) {
  const [input, setInput] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(TIME_BUDGET_MS);
  const [showCaptchaModal, setShowCaptchaModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Timer countdown when it's my turn
  useEffect(() => {
    if (!isMyTurn || !currentTurn || isStreaming) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - currentTurn.startedAt;
      const remaining = Math.max(0, currentTurn.timeBudgetMs - currentTurn.timeUsedMs - elapsed);
      setTimeRemaining(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [isMyTurn, currentTurn, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
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
          src={member.avatar}
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
      <div className="flex-1 overflow-y-auto mb-3 space-y-2 min-h-[200px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'citizen' ? 'flex-row-reverse' : ''}`}
          >
            {msg.role === 'council' ? (
              <img
                src={member.avatar}
                alt={member.name}
                className="w-8 h-8 object-contain shrink-0"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xs">C</span>
              </div>
            )}
            <div
              className={`rounded p-2 max-w-[80%] ${
                msg.role === 'council'
                  ? 'bg-white border border-gray-300'
                  : 'bg-blue-100 border border-blue-300'
              }`}
            >
              {msg.citizenName && (
                <p className="font-retro text-[10px] text-gray-500 mb-1">{msg.citizenName}</p>
              )}
              <p className="font-retro text-xs text-gray-700 whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <div className="flex gap-2">
            <img
              src={member.avatar}
              alt={member.name}
              className="w-8 h-8 object-contain shrink-0"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="bg-white border border-gray-300 rounded p-2 max-w-[80%]">
              <p className="font-retro text-xs text-gray-700 whitespace-pre-wrap">
                {streamingContent}
                <span className="animate-pulse">|</span>
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Turn status / input area */}
      {isMyTurn ? (
        <div className="space-y-2">
          {/* Turn limits display */}
          <div className="flex justify-between text-[10px] font-retro text-gray-500">
            <span>Time: {Math.ceil(timeRemaining / 1000)}s</span>
            <span>{messagesRemaining} msg left</span>
            <span className={charsRemaining < 50 ? 'text-red-500' : ''}>
              {charsRemaining} chars
            </span>
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="input-retro flex-1 font-retro text-base"
              disabled={isStreaming || charsRemaining < 0 || messagesRemaining <= 0}
              maxLength={currentTurn?.charBudget ?? CHAR_BUDGET}
            />
            <button
              type="submit"
              className="btn-retro text-xs px-3"
              disabled={!input.trim() || isStreaming || charsRemaining < 0 || messagesRemaining <= 0}
            >
              Send
            </button>
          </form>
        </div>
      ) : queuePosition !== null ? (
        <div className="space-y-2">
          <div className="bg-yellow-100 border border-yellow-400 rounded p-2">
            <p className="font-retro text-xs text-yellow-800 text-center">
              {queuePosition === 0
                ? "You're next! Get ready..."
                : `Position in queue: ${queuePosition + 1}`}
            </p>
          </div>
          <button onClick={onLeaveQueue} className="btn-retro w-full text-xs">
            Leave Queue
          </button>
        </div>
      ) : isAuthenticated ? (
        <button
          onClick={() => {
            if (needsCaptcha()) {
              setShowCaptchaModal(true);
            } else {
              onRaiseHand();
            }
          }}
          className="btn-retro w-full text-xs"
        >
          Raise Hand to Speak
        </button>
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
    </div>
  );
}
