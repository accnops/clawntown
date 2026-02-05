'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscribeBroadcast } from '@/lib/supabase';

interface Message {
  id: string;
  role: 'citizen' | 'council';
  content: string;
  timestamp: Date;
}

interface TokenPayload {
  memberId: string;
  turnId: string;
  token: string;
}

interface TurnEndPayload {
  memberId: string;
  turnId: string;
  reason: 'completed' | 'timed_out' | 'budget_exhausted';
}

interface TurnStartPayload {
  memberId: string;
  turnId: string;
  citizenId: string;
}

export function useConversationStream(memberId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [activeTurnId, setActiveTurnId] = useState<string | null>(null);
  const [activeCitizenId, setActiveCitizenId] = useState<string | null>(null);

  // Subscribe to conversation broadcast channel
  useEffect(() => {
    const subscriptions: ReturnType<typeof subscribeBroadcast>[] = [];

    // Subscribe to token stream
    const tokenSub = subscribeBroadcast<TokenPayload>(
      'conversation',
      'token',
      (payload) => {
        if (payload.memberId === memberId) {
          setIsStreaming(true);
          setStreamingContent((prev) => prev + payload.token);
        }
      }
    );
    subscriptions.push(tokenSub);

    // Subscribe to turn start
    const turnStartSub = subscribeBroadcast<TurnStartPayload>(
      'conversation',
      'turn_start',
      (payload) => {
        if (payload.memberId === memberId) {
          setActiveTurnId(payload.turnId);
          setActiveCitizenId(payload.citizenId);
          setStreamingContent('');
          setIsStreaming(false);
        }
      }
    );
    subscriptions.push(turnStartSub);

    // Subscribe to turn end
    const turnEndSub = subscribeBroadcast<TurnEndPayload>(
      'conversation',
      'turn_end',
      (payload) => {
        if (payload.memberId === memberId) {
          // Finalize the streaming message
          if (streamingContent) {
            setMessages((prev) => [
              ...prev,
              {
                id: `${payload.turnId}-response`,
                role: 'council',
                content: streamingContent,
                timestamp: new Date(),
              },
            ]);
          }
          setIsStreaming(false);
          setStreamingContent('');
          setActiveTurnId(null);
          setActiveCitizenId(null);
        }
      }
    );
    subscriptions.push(turnEndSub);

    return () => {
      subscriptions.forEach((sub) => sub.unsubscribe());
    };
  }, [memberId, streamingContent]);

  // Add a message to the conversation
  const addMessage = useCallback((role: 'citizen' | 'council', content: string) => {
    const message: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      role,
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, message]);
  }, []);

  // Clear the conversation
  const clearConversation = useCallback(() => {
    setMessages([]);
    setStreamingContent('');
    setIsStreaming(false);
  }, []);

  return {
    messages,
    isStreaming,
    streamingContent,
    activeTurnId,
    activeCitizenId,
    addMessage,
    clearConversation,
  };
}
