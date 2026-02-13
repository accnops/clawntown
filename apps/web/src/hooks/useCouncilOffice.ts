'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { CouncilMember, ConversationMessage, CitizenTurn } from '@clawntown/shared';

// Transform snake_case DB data to camelCase for TypeScript
function normalizeTurn(dbTurn: Record<string, unknown> | null): CitizenTurn | null {
  if (!dbTurn) return null;
  return {
    id: dbTurn.id as string,
    sessionId: (dbTurn.session_id || dbTurn.sessionId) as string,
    memberId: (dbTurn.member_id || dbTurn.memberId) as string,
    citizenId: (dbTurn.citizen_id || dbTurn.citizenId) as string,
    citizenName: (dbTurn.citizen_name || dbTurn.citizenName || '') as string,
    charsUsed: (dbTurn.chars_used ?? dbTurn.charsUsed ?? 0) as number,
    charBudget: (dbTurn.char_budget ?? dbTurn.charBudget ?? 500) as number,
    timeUsedMs: (dbTurn.time_used_ms ?? dbTurn.timeUsedMs ?? 0) as number,
    timeBudgetMs: (dbTurn.time_budget_ms ?? dbTurn.timeBudgetMs ?? 20000) as number,
    messagesUsed: (dbTurn.messages_used ?? dbTurn.messagesUsed ?? 0) as number,
    messageLimit: (dbTurn.message_limit ?? dbTurn.messageLimit ?? 2) as number,
    startedAt: new Date(dbTurn.started_at as string || dbTurn.startedAt as string).getTime(),
    status: (dbTurn.status || 'active') as 'active' | 'completed' | 'expired',
  };
}

function normalizeMessage(dbMsg: Record<string, unknown>): ConversationMessage {
  return {
    id: dbMsg.id as string,
    sessionId: (dbMsg.session_id || dbMsg.sessionId) as string,
    role: dbMsg.role as 'citizen' | 'council',
    citizenId: (dbMsg.citizen_id || dbMsg.citizenId || null) as string | null,
    citizenName: (dbMsg.citizen_name || dbMsg.citizenName || null) as string | null,
    citizenAvatar: (dbMsg.citizen_avatar || dbMsg.citizenAvatar || null) as string | null,
    content: dbMsg.content as string,
    createdAt: new Date((dbMsg.created_at || dbMsg.createdAt) as string),
  };
}

interface UseCouncilOfficeOptions {
  member: CouncilMember;
  citizenId?: string;
}

export function useCouncilOffice({ member, citizenId }: UseCouncilOfficeOptions) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [queueLength, setQueueLength] = useState(0);
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const [currentTurn, setCurrentTurn] = useState<CitizenTurn | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Track if we're in queue to know when to decrement position
  const inQueueRef = useRef(false);
  const heartbeatIntervalRef = useRef<number>(15000); // Start with 15s
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subscribe to broadcast events
  useEffect(() => {
    const channel = supabase.channel(`council:${member.id}`);

    channel
      // Chat messages - dedupe by id (for optimistic updates)
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        const msg = normalizeMessage(payload.message);
        setMessages(prev => {
          // Check if we already have this message by id
          if (prev.some(m => m.id === msg.id)) {
            return prev;
          }
          // Check for temp message to replace (content may differ due to sanitization)
          const tempIndex = prev.findIndex(m =>
            m.id.startsWith('temp-') &&
            m.role === msg.role &&
            m.citizenId === msg.citizenId
          );
          if (tempIndex !== -1) {
            // Replace temp message with real one (sanitized version from server)
            const updated = [...prev];
            updated[tempIndex] = msg;
            return updated;
          }
          return [...prev, msg];
        });
        // Clear streaming content when final message arrives (for spectators)
        if (msg.role === 'council') {
          setIsStreaming(false);
          setStreamingContent('');
        }
      })
      // Turn started - someone's turn began
      .on('broadcast', { event: 'turn_started' }, ({ payload }) => {
        setCurrentTurn(normalizeTurn(payload.turn));
        setQueueLength(payload.queueLength ?? 0);
        // If we're in queue, decrement position (someone ahead got their turn)
        if (inQueueRef.current) {
          setQueuePosition(prev => prev !== null && prev > 0 ? prev - 1 : prev);
        }
      })
      // Turn ended
      .on('broadcast', { event: 'turn_ended' }, ({ payload }) => {
        if (payload.nextTurn) {
          setCurrentTurn(normalizeTurn(payload.nextTurn));
        } else {
          setCurrentTurn(null);
        }
        setQueueLength(payload.queueLength ?? 0);
      })
      // Queue updated (someone left)
      .on('broadcast', { event: 'queue_updated' }, ({ payload }) => {
        setQueueLength(payload.queueLength ?? 0);
        // If we're in queue and queue got shorter, we might have moved up
        if (inQueueRef.current) {
          setQueuePosition(prev => prev !== null && prev > 0 ? prev - 1 : prev);
        }
      })
      // Presence for spectator count
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setSpectatorCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    // Fetch initial state once on mount
    setIsLoading(true);
    fetch(`/api/queue/status?memberId=${member.id}${citizenId ? `&citizenId=${citizenId}` : ''}`)
      .then(res => res.json())
      .then(data => {
        setQueueLength(data.queueLength ?? 0);
        setCurrentTurn(normalizeTurn(data.currentTurn));
        if (data.position !== undefined && data.position !== null) {
          setQueuePosition(data.position);
          inQueueRef.current = true;
        }
        // Load message history
        if (data.messages?.length > 0) {
          setMessages(data.messages.map((m: Record<string, unknown>) => normalizeMessage(m)));
        }
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      channel.unsubscribe();
    };
  }, [member.id]);

  // Heartbeat while in queue - dynamic interval based on position
  // Track if this is the first heartbeat (should be immediate)
  const isFirstHeartbeatRef = useRef(true);

  useEffect(() => {
    if (!citizenId || !inQueueRef.current) {
      // Not in queue, clear any pending heartbeat
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = null;
      }
      isFirstHeartbeatRef.current = true; // Reset for next time we join
      return;
    }

    const sendHeartbeat = async () => {
      try {
        const res = await fetch('/api/queue/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId: member.id, citizenId }),
        });

        const data = await res.json();

        if (data.offline) {
          // Council member went offline
          setQueuePosition(null);
          inQueueRef.current = false;
          return;
        }

        if (data.turnStarted) {
          // Our turn started via heartbeat!
          if (data.currentTurn) {
            setCurrentTurn(normalizeTurn(data.currentTurn));
          }
          setQueuePosition(null);
          inQueueRef.current = false; // No longer "waiting" in queue
        } else if (data.position !== undefined && data.position !== null) {
          setQueuePosition(data.position);
        } else if (data.action === 'not_in_queue') {
          // We're no longer in queue (maybe got skipped)
          setQueuePosition(null);
          inQueueRef.current = false;
        }

        // Always sync currentTurn from heartbeat for consistency
        if (data.currentTurn !== undefined) {
          setCurrentTurn(data.currentTurn ? normalizeTurn(data.currentTurn) : null);
        }

        if (data.queueLength !== undefined) {
          setQueueLength(data.queueLength);
        }

        // Use server-recommended interval, or default
        if (data.nextHeartbeatMs) {
          heartbeatIntervalRef.current = data.nextHeartbeatMs;
        }
      } catch (error) {
        console.warn('Heartbeat failed:', error);
      }

      // Schedule next heartbeat if still in queue
      if (inQueueRef.current) {
        heartbeatTimeoutRef.current = setTimeout(sendHeartbeat, heartbeatIntervalRef.current);
      }
    };

    // Start heartbeat loop - first heartbeat is immediate, then uses dynamic interval
    const initialDelay = isFirstHeartbeatRef.current ? 0 : heartbeatIntervalRef.current;
    isFirstHeartbeatRef.current = false;
    heartbeatTimeoutRef.current = setTimeout(sendHeartbeat, initialDelay);

    return () => {
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = null;
      }
    };
  }, [member.id, citizenId, queuePosition]); // Re-run when queue position changes

  const isMyTurn = currentTurn?.citizenId === citizenId;

  const raiseHand = useCallback(async (citizenName: string, citizenAvatar: string) => {
    if (!citizenId) return;

    const res = await fetch('/api/queue/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: member.id,
        citizenId,
        citizenName,
        citizenAvatar,
      }),
    });

    const result = await res.json();

    if (res.ok) {
      // Set initial queue position from API response
      setQueuePosition(result.position ?? 0);
      setQueueLength(result.queueLength ?? 1);
      inQueueRef.current = true;

      // If turn was auto-started (first in line), update state
      if (result.turn) {
        setCurrentTurn(normalizeTurn(result.turn));
      }
    }

    return result;
  }, [member.id, citizenId]);

  const leaveQueue = useCallback(async () => {
    if (!citizenId) return;

    const res = await fetch('/api/queue/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id, citizenId }),
    });

    if (res.ok) {
      setQueuePosition(null);
      inQueueRef.current = false;
    }

    return res.json();
  }, [member.id, citizenId]);

  const sendMessage = useCallback(async (content: string, citizenName?: string, citizenAvatar?: string) => {
    if (!citizenId) return;

    // Optimistic UI: show message immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ConversationMessage = {
      id: tempId,
      sessionId: '',
      role: 'citizen',
      citizenId,
      citizenName: citizenName || 'You',
      citizenAvatar: citizenAvatar || null,
      content,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setIsStreaming(true);  // Show loading state for council response

    const res = await fetch('/api/turn/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id, citizenId, content }),
    });

    const data = await res.json();

    if (res.status === 422 && data.error === 'message_rejected') {
      // Remove optimistic message on rejection
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setIsStreaming(false);
      return { rejected: true, reason: data.reason };
    }

    if (!res.ok) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setIsStreaming(false);
      return { rejected: false, error: data.error };
    }

    // If turn ended and we left queue, update state
    if (data.leftQueue) {
      setQueuePosition(null);
      inQueueRef.current = false;
      setCurrentTurn(null);
    }

    // Success - streaming will end when broadcast arrives or we can end it here
    setIsStreaming(false);
    return data;
  }, [member.id, citizenId]);

  const endTurn = useCallback(async () => {
    const res = await fetch('/api/turn/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id, reason: 'timeout' }),
    });

    const result = await res.json();

    if (res.ok) {
      setQueuePosition(null);
      inQueueRef.current = false;
      // Update to next turn if there is one
      if (result.nextTurn) {
        setCurrentTurn(normalizeTurn(result.nextTurn));
      } else {
        setCurrentTurn(null);
      }
    }

    return result;
  }, [member.id]);

  // Optimistic "speak" - tries to send directly if queue appears empty
  // Returns { action: 'sent' | 'queued' | 'rejected', ... }
  const speak = useCallback(async (content: string, citizenName: string, citizenAvatar: string) => {
    if (!citizenId) return { action: 'error', error: 'Not authenticated' };

    // Optimistic UI: show message immediately
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: ConversationMessage = {
      id: tempId,
      sessionId: '',
      role: 'citizen',
      citizenId,
      citizenName: citizenName || 'You',
      citizenAvatar: citizenAvatar || null,
      content,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setIsStreaming(true);  // Show loading state for council response

    const res = await fetch('/api/queue/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: member.id,
        citizenId,
        citizenName,
        citizenAvatar,
        content,
      }),
    });

    const data = await res.json();

    if (res.status === 422) {
      // Message rejected - remove optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setIsStreaming(false);
      return { action: 'rejected', reason: data.reason };
    }

    if (!res.ok) {
      // Error - remove optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setIsStreaming(false);
      return { action: 'error', error: data.error };
    }

    if (data.action === 'queued') {
      // Race condition - we got queued instead, remove optimistic message
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setIsStreaming(false);
      setQueuePosition(data.position ?? 0);
      setQueueLength(data.queueLength ?? 1);
      inQueueRef.current = true;
      return { action: 'queued', position: data.position };
    }

    if (data.action === 'sent') {
      // Message was sent successfully
      setQueuePosition(null);
      inQueueRef.current = false;
      if (data.nextTurn) {
        setCurrentTurn(normalizeTurn(data.nextTurn));
      } else {
        setCurrentTurn(null);
      }
      setQueueLength(data.queueLength ?? 0);

      // Add citizen message from response (replaces optimistic, handles sanitization)
      if (data.citizenMessage) {
        const realCitizenMsg = normalizeMessage(data.citizenMessage);
        setMessages(prev => {
          // Replace temp message with real one
          const tempIndex = prev.findIndex(m => m.id === tempId);
          if (tempIndex !== -1) {
            const updated = [...prev];
            updated[tempIndex] = realCitizenMsg;
            return updated;
          }
          // Or add if not found (shouldn't happen)
          if (!prev.some(m => m.id === realCitizenMsg.id)) {
            return [...prev, realCitizenMsg];
          }
          return prev;
        });
      }

      // Add council message from response (don't wait for broadcast)
      if (data.councilMessage) {
        const councilMsg = normalizeMessage(data.councilMessage);
        setMessages(prev => {
          if (!prev.some(m => m.id === councilMsg.id)) {
            return [...prev, councilMsg];
          }
          return prev;
        });
      }

      setIsStreaming(false);
      return { action: 'sent' };
    }

    // Unexpected - remove optimistic message
    setMessages(prev => prev.filter(m => m.id !== tempId));
    setIsStreaming(false);
    return { action: 'error', error: 'Unexpected response' };
  }, [member.id, citizenId]);

  // Check if queue appears empty (for UI to decide button text)
  const queueAppearsEmpty = queueLength === 0 && !currentTurn;

  return {
    messages,
    queueLength,
    queuePosition,
    currentTurn,
    isMyTurn,
    isLoading,
    spectatorCount,
    isStreaming,
    streamingContent,
    queueAppearsEmpty,
    raiseHand,
    leaveQueue,
    sendMessage,
    speak,
    endTurn,
  };
}
