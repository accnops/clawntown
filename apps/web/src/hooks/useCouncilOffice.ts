'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import type { CouncilMember, ConversationMessage } from '@clawntown/shared';

// Transform snake_case DB data to camelCase for TypeScript
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

/**
 * Chat state machine - simplified from design doc
 */
type ChatState =
  | { status: 'idle' }
  | { status: 'sending'; pendingId: string; pendingContent: string }
  | { status: 'queued'; position: number; queueLength: number; pendingContent: string }
  | { status: 'myTurn'; expiresAt: number; pendingContent: string }
  | { status: 'error'; message: string };

interface UseCouncilOfficeOptions {
  member: CouncilMember;
  citizenId?: string;
  citizenName?: string;
  citizenAvatar?: string;
}

export function useCouncilOffice({ member, citizenId, citizenName, citizenAvatar }: UseCouncilOfficeOptions) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [chatState, setChatState] = useState<ChatState>({ status: 'idle' });
  const [queueLength, setQueueLength] = useState(0);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Refs for tracking
  const heartbeatIntervalRef = useRef<number>(15000);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const turnExpiryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Computed properties
  const canSend = chatState.status === 'idle' || chatState.status === 'myTurn';
  const isQueued = chatState.status === 'queued';
  const isMyTurn = chatState.status === 'myTurn';
  const isSending = chatState.status === 'sending';

  // Get pending content if in queued or myTurn state (for restoring to input)
  const pendingContent =
    (chatState.status === 'queued' || chatState.status === 'myTurn')
      ? chatState.pendingContent
      : '';

  // Clear turn expiry timer
  const clearTurnExpiryTimer = useCallback(() => {
    if (turnExpiryTimeoutRef.current) {
      clearTimeout(turnExpiryTimeoutRef.current);
      turnExpiryTimeoutRef.current = null;
    }
  }, []);

  // Start turn expiry timer
  const startTurnExpiryTimer = useCallback((expiresAt: number, pendingContent: string) => {
    clearTurnExpiryTimer();
    const timeUntilExpiry = expiresAt - Date.now();
    if (timeUntilExpiry > 0) {
      turnExpiryTimeoutRef.current = setTimeout(() => {
        // Silent expiry - return to idle, message stays in input
        setChatState({ status: 'idle' });
      }, timeUntilExpiry);
    }
  }, [clearTurnExpiryTimer]);

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
          // Check for temp message to replace (by pendingId match)
          const tempIndex = prev.findIndex(m =>
            m.id.startsWith('pending-') &&
            m.role === msg.role &&
            m.citizenId === msg.citizenId
          );
          if (tempIndex !== -1) {
            // Replace pending message with real one
            const updated = [...prev];
            updated[tempIndex] = msg;
            return updated;
          }
          // Add and sort by createdAt to handle out-of-order arrivals
          return [...prev, msg].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        });
      })
      // Turn started - someone's turn began
      .on('broadcast', { event: 'turn_started' }, ({ payload }) => {
        const turn = payload.turn;
        console.log('[useCouncilOffice] turn_started broadcast', { turn_citizen_id: turn?.citizen_id, my_citizen_id: citizenId, queueLength: payload.queueLength });
        setQueueLength(payload.queueLength ?? 0);

        // Check if this is MY turn
        if (turn?.citizen_id === citizenId) {
          const expiresAt = new Date(turn.expires_at).getTime();
          setChatState(prev => {
            console.log('[useCouncilOffice] MY turn started, prev state:', prev.status);
            const pendingContent = prev.status === 'queued' ? prev.pendingContent : '';
            startTurnExpiryTimer(expiresAt, pendingContent);
            return { status: 'myTurn', expiresAt, pendingContent };
          });
        } else {
          // Someone else got a turn - if we're queued, decrement position
          setChatState(prev => {
            if (prev.status === 'queued' && prev.position > 1) {
              console.log('[useCouncilOffice] Someone else turn, decrementing position', prev.position, '->', prev.position - 1);
              return { ...prev, position: prev.position - 1 };
            }
            return prev;
          });
        }
      })
      // Turn ended
      .on('broadcast', { event: 'turn_ended' }, ({ payload }) => {
        console.log('[useCouncilOffice] turn_ended broadcast', { endedTurn: payload.endedTurn, queueLength: payload.queueLength });
        setQueueLength(payload.queueLength ?? 0);
        // If I was in myTurn, go back to idle
        setChatState(prev => {
          if (prev.status === 'myTurn') {
            console.log('[useCouncilOffice] My turn ended, going to idle');
            clearTurnExpiryTimer();
            return { status: 'idle' };
          }
          return prev;
        });
      })
      // Queue updated
      .on('broadcast', { event: 'queue_updated' }, ({ payload }) => {
        setQueueLength(payload.queueLength ?? 0);
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

        // Check if user is in queue or has active turn
        if (data.currentTurn?.citizen_id === citizenId) {
          const expiresAt = new Date(data.currentTurn.expires_at).getTime();
          // Only set myTurn if turn hasn't expired yet
          if (expiresAt > Date.now()) {
            startTurnExpiryTimer(expiresAt, '');
            setChatState({ status: 'myTurn', expiresAt, pendingContent: '' });
          }
          // If expired, stay in idle state - turn will be cleaned up
        } else if (data.position !== undefined && data.position !== null) {
          setChatState({
            status: 'queued',
            position: data.position,
            queueLength: data.queueLength ?? 0,
            pendingContent: ''
          });
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
      clearTurnExpiryTimer();
    };
  }, [member.id, citizenId, startTurnExpiryTimer, clearTurnExpiryTimer]);

  // Heartbeat while in queue
  useEffect(() => {
    if (!citizenId || chatState.status !== 'queued') {
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = null;
      }
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

        if (data.offline || data.action === 'not_in_queue') {
          // Council member went offline or we're no longer in queue
          setChatState({ status: 'idle' });
          return;
        }

        if (data.turnStarted && data.currentTurn) {
          // Our turn started via heartbeat!
          const expiresAt = new Date(data.currentTurn.expires_at).getTime();
          setChatState(prev => {
            const pendingContent = prev.status === 'queued' ? prev.pendingContent : '';
            startTurnExpiryTimer(expiresAt, pendingContent);
            return { status: 'myTurn', expiresAt, pendingContent };
          });
          return;
        }

        // Update position if provided
        if (data.position !== undefined && data.position !== null) {
          setChatState(prev => {
            if (prev.status === 'queued') {
              return { ...prev, position: data.position, queueLength: data.queueLength ?? prev.queueLength };
            }
            return prev;
          });
        }

        if (data.queueLength !== undefined) {
          setQueueLength(data.queueLength);
        }

        // Use server-recommended interval
        if (data.nextHeartbeatMs) {
          heartbeatIntervalRef.current = data.nextHeartbeatMs;
        }
      } catch (error) {
        console.warn('Heartbeat failed:', error);
      }

      // Schedule next heartbeat if still in queue
      if (chatState.status === 'queued') {
        heartbeatTimeoutRef.current = setTimeout(sendHeartbeat, heartbeatIntervalRef.current);
      }
    };

    // Start heartbeat loop immediately
    heartbeatTimeoutRef.current = setTimeout(sendHeartbeat, 0);

    return () => {
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
        heartbeatTimeoutRef.current = null;
      }
    };
  }, [member.id, citizenId, chatState.status, startTurnExpiryTimer]);

  // Leave queue
  const leaveQueue = useCallback(async () => {
    if (!citizenId || chatState.status !== 'queued') return;

    const res = await fetch('/api/queue/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id, citizenId }),
    });

    if (res.ok) {
      setChatState({ status: 'idle' });
    }

    return res.json();
  }, [member.id, citizenId, chatState.status]);

  /**
   * Send a message - the unified "speak" action
   *
   * Flow:
   * 1. If idle: show optimistic message, call /api/queue/speak
   * 2. If response is "sent": keep message, done
   * 3. If response is "queued": remove optimistic, store content, enter queued state
   * 4. If myTurn: same as idle (optimistic + speak)
   */
  const sendMessage = useCallback(async (content: string): Promise<{
    success: boolean;
    action?: 'sent' | 'queued' | 'rejected';
    error?: string;
    reason?: string;
    requiresCaptcha?: boolean;
  }> => {
    if (!citizenId || !canSend) {
      return { success: false, error: 'Cannot send message right now' };
    }

    const pendingId = `pending-${Date.now()}`;
    const finalCitizenName = citizenName || 'Citizen';
    const finalCitizenAvatar = citizenAvatar || null;

    // Transition to sending state
    setChatState({ status: 'sending', pendingId, pendingContent: content });

    // Optimistic UI: show message immediately (only if idle/myTurn)
    const optimisticMessage: ConversationMessage = {
      id: pendingId,
      sessionId: '',
      role: 'citizen',
      citizenId,
      citizenName: finalCitizenName,
      citizenAvatar: finalCitizenAvatar,
      content,
      createdAt: new Date(),
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const res = await fetch('/api/queue/speak', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          memberId: member.id,
          citizenId,
          citizenName: finalCitizenName,
          citizenAvatar: finalCitizenAvatar,
          content,
        }),
      });

      const data = await res.json();
      console.log('[useCouncilOffice] speak response', { status: res.status, action: data.action, error: data.error, position: data.position, queueLength: data.queueLength });

      // Handle captcha requirement
      if (data.requiresCaptcha) {
        setMessages(prev => prev.filter(m => m.id !== pendingId));
        setChatState({ status: 'idle' });
        return { success: false, error: data.error, requiresCaptcha: true };
      }

      // Message rejected (moderation)
      if (res.status === 422) {
        setMessages(prev => prev.filter(m => m.id !== pendingId));
        setChatState({ status: 'idle' });
        return { success: false, action: 'rejected', reason: data.reason };
      }

      // Other errors
      if (!res.ok) {
        setMessages(prev => prev.filter(m => m.id !== pendingId));
        setChatState({ status: 'idle' });
        return { success: false, error: data.error };
      }

      // Queued (race condition - someone else got in first)
      if (data.action === 'queued') {
        setMessages(prev => prev.filter(m => m.id !== pendingId));
        setQueueLength(data.queueLength ?? 1);
        // Don't regress from myTurn to queued - turn_started broadcast may have arrived first
        setChatState(prev => {
          if (prev.status === 'myTurn') {
            console.log('[useCouncilOffice] NOT regressing from myTurn to queued - turn already started');
            return prev;
          }
          console.log('[useCouncilOffice] Setting state to queued, position:', data.position);
          return {
            status: 'queued',
            position: data.position ?? 1,
            queueLength: data.queueLength ?? 1,
            pendingContent: content  // Store for when it's our turn
          };
        });
        return { success: true, action: 'queued' };
      }

      // Sent successfully
      if (data.action === 'sent') {
        setQueueLength(data.queueLength ?? 0);
        clearTurnExpiryTimer();
        setChatState({ status: 'idle' });

        // Replace optimistic with real message from response
        if (data.citizenMessage) {
          const realMsg = normalizeMessage(data.citizenMessage);
          setMessages(prev => {
            const idx = prev.findIndex(m => m.id === pendingId);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = realMsg;
              return updated;
            }
            // Or dedupe if broadcast already arrived
            if (!prev.some(m => m.id === realMsg.id)) {
              return [...prev, realMsg];
            }
            return prev;
          });
        }

        // Add council response
        if (data.councilMessage) {
          const councilMsg = normalizeMessage(data.councilMessage);
          setMessages(prev => {
            if (!prev.some(m => m.id === councilMsg.id)) {
              return [...prev, councilMsg];
            }
            return prev;
          });
        }

        return { success: true, action: 'sent' };
      }

      // Unexpected response
      console.error('[useCouncilOffice] Unexpected response from speak API', { data });
      setMessages(prev => prev.filter(m => m.id !== pendingId));
      setChatState({ status: 'idle' });
      return { success: false, error: data.error || 'Unexpected response' };
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== pendingId));
      setChatState({ status: 'idle' });
      return { success: false, error: 'Network error' };
    }
  }, [citizenId, citizenName, citizenAvatar, member.id, canSend, clearTurnExpiryTimer]);

  return {
    // State
    messages,
    chatState,
    queueLength,
    spectatorCount,
    isLoading,

    // Computed
    canSend,
    isQueued,
    isMyTurn,
    isSending,
    pendingContent,
    queuePosition: chatState.status === 'queued' ? chatState.position : null,
    turnExpiresAt: chatState.status === 'myTurn' ? chatState.expiresAt : null,

    // Actions
    sendMessage,
    leaveQueue,
  };
}
