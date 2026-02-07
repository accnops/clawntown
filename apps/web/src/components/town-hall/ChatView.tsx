'use client';

import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks';
import type { CouncilMember } from '@clawntown/shared';

interface ChatViewProps {
  member: CouncilMember;
  citizenName: string;
  onBack: () => void;
}

export function ChatView({ member, citizenName, onBack }: ChatViewProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, isLoading, error, sendMessage } = useChat({
    memberId: member.id,
    citizenName,
  });

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-400">
        <button
          onClick={onBack}
          className="font-retro text-xs text-blue-600 hover:underline cursor-pointer"
        >
          &larr; Lobby
        </button>
        <img
          src={member.avatarSpinning || member.avatar}
          alt={member.name}
          className="w-12 h-12 object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-retro text-sm font-bold truncate">{member.name}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto mb-3 space-y-2 min-h-[200px]">
        {/* Greeting */}
        <div className="flex gap-2">
          <img
            src={member.avatar}
            alt={member.name}
            className="w-8 h-8 object-contain shrink-0"
            style={{ imageRendering: 'pixelated' }}
          />
          <div className="bg-white border border-gray-300 rounded p-2 max-w-[80%]">
            <p className="font-retro text-xs text-gray-700">
              Welcome, {citizenName}! How can I help you today?
            </p>
          </div>
        </div>

        {/* Chat messages */}
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
                <span className="text-xs">🦞</span>
              </div>
            )}
            <div
              className={`rounded p-2 max-w-[80%] ${
                msg.role === 'council'
                  ? 'bg-white border border-gray-300'
                  : 'bg-blue-100 border border-blue-300'
              }`}
            >
              <p className="font-retro text-xs text-gray-700 whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex gap-2">
            <img
              src={member.avatar}
              alt={member.name}
              className="w-8 h-8 object-contain shrink-0"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="bg-white border border-gray-300 rounded p-2">
              <p className="font-retro text-xs text-gray-500 animate-pulse">
                Thinking...
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-300 rounded p-2">
            <p className="font-retro text-xs text-red-700">{error}</p>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="input-retro flex-1 font-retro text-base"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="btn-retro text-xs px-3"
          disabled={!input.trim() || isLoading}
        >
          Send
        </button>
      </form>
    </div>
  );
}
