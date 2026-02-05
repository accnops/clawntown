'use client';

import { useState, useRef, useEffect } from 'react';

interface Message {
  id: string;
  role: 'citizen' | 'council';
  content: string;
  timestamp: Date;
}

interface ConversationViewProps {
  memberName: string;
  memberEmoji: string;
  isOnline: boolean;
  greeting: string;
  onSendMessage?: (message: string) => void;
  messages?: Message[];
  isStreaming?: boolean;
  streamingContent?: string;
  queuePosition?: number;
  isMyTurn?: boolean;
}

export function ConversationView({
  memberName,
  memberEmoji,
  isOnline,
  greeting,
  onSendMessage,
  messages = [],
  isStreaming = false,
  streamingContent = '',
  queuePosition,
  isMyTurn = false,
}: ConversationViewProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !onSendMessage) return;
    onSendMessage(input.trim());
    setInput('');
  };

  return (
    <div className="flex flex-col h-full max-h-[60vh]">
      {/* Council member header */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-400">
        <div className="w-12 h-12 bg-lobster-red rounded flex items-center justify-center text-2xl shrink-0">
          {memberEmoji}
        </div>
        <div className="min-w-0">
          <p className="font-retro text-sm font-bold truncate">{memberName}</p>
          <p className={`font-retro text-xs ${isOnline ? 'text-green-700' : 'text-gray-500'}`}>
            {isOnline ? '● Online' : '○ Offline'}
          </p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto mb-3 space-y-3 min-h-[150px]">
        {/* Greeting message */}
        <div className="flex gap-2">
          <div className="w-6 h-6 bg-lobster-red rounded flex items-center justify-center text-xs shrink-0">
            {memberEmoji}
          </div>
          <div className="bg-white border border-gray-300 rounded p-2 max-w-[85%]">
            <p className="font-retro text-xs text-gray-700">{greeting}</p>
          </div>
        </div>

        {/* Conversation messages */}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'citizen' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-6 h-6 rounded flex items-center justify-center text-xs shrink-0 ${
                msg.role === 'council' ? 'bg-lobster-red' : 'bg-blue-500'
              }`}
            >
              {msg.role === 'council' ? memberEmoji : '👤'}
            </div>
            <div
              className={`border rounded p-2 max-w-[85%] ${
                msg.role === 'council'
                  ? 'bg-white border-gray-300'
                  : 'bg-blue-100 border-blue-300'
              }`}
            >
              <p className="font-retro text-xs text-gray-700 whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <div className="flex gap-2">
            <div className="w-6 h-6 bg-lobster-red rounded flex items-center justify-center text-xs shrink-0">
              {memberEmoji}
            </div>
            <div className="bg-white border border-gray-300 rounded p-2 max-w-[85%]">
              <p className="font-retro text-xs text-gray-700 whitespace-pre-wrap">
                {streamingContent}
                <span className="animate-pulse">▌</span>
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Queue/turn status */}
      {!isMyTurn && queuePosition !== undefined && (
        <div className="bg-yellow-100 border border-yellow-400 rounded p-2 mb-3">
          <p className="font-retro text-xs text-yellow-800 text-center">
            {queuePosition === 0
              ? "You're next! Waiting for current conversation to end..."
              : `Queue position: ${queuePosition + 1}`}
          </p>
        </div>
      )}

      {/* Input area */}
      {isMyTurn ? (
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message..."
            className="input-retro flex-1 font-retro text-xs"
            disabled={isStreaming || !isOnline}
          />
          <button
            type="submit"
            className="btn-retro text-xs px-3"
            disabled={!input.trim() || isStreaming || !isOnline}
          >
            Send
          </button>
        </form>
      ) : (
        <div className="flex gap-2">
          <button className="btn-retro flex-1 text-xs" disabled={!isOnline}>
            🙋 Raise Hand
          </button>
          <button className="btn-retro flex-1 text-xs">
            👀 Watch
          </button>
        </div>
      )}

      {/* Offline message */}
      {!isOnline && (
        <p className="font-retro text-xs text-gray-500 text-center mt-2">
          {memberName} is currently offline. Check back during office hours!
        </p>
      )}
    </div>
  );
}
