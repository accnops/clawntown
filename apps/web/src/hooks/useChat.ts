'use client';

import { useState, useCallback } from 'react';

interface ChatMessage {
  id: string;
  role: 'citizen' | 'council';
  content: string;
  timestamp: Date;
}

interface UseChatOptions {
  memberId: string;
  citizenName: string;
}

export function useChat({ memberId, citizenName }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    setError(null);
    setIsLoading(true);

    // Add citizen message immediately
    const citizenMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'citizen',
      content: content.trim(),
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, citizenMessage]);

    try {
      // Build history for context
      const history = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId,
          citizenName,
          message: content.trim(),
          history,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 422 && data.error === 'message_rejected') {
          // Remove the optimistically-added citizen message
          setMessages((prev) => prev.filter((m) => m.id !== citizenMessage.id));
          setError(data.reason || 'Message was rejected');
          setIsLoading(false);
          return;
        }
        throw new Error(data.error || 'Failed to get response');
      }

      // Add council response
      const councilMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'council',
        content: data.response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, councilMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsLoading(false);
    }
  }, [memberId, citizenName, messages, isLoading]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearChat,
  };
}
