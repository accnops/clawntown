'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CouncilMember, ConversationMessage, CitizenTurn, QueueEntry } from '@clawntown/shared';

interface UseCouncilOfficeOptions {
  member: CouncilMember;
  citizenId?: string;
}

export function useCouncilOffice({ member, citizenId }: UseCouncilOfficeOptions) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [currentTurn, setCurrentTurn] = useState<CitizenTurn | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase.channel(`council:${member.id}`);
    const queueChannel = supabase.channel(`council:${member.id}:queue`);

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setMessages(prev => [...prev, payload.message]);
      })
      .on('broadcast', { event: 'turn_start' }, ({ payload }) => {
        setCurrentTurn(payload.turn);
      })
      .on('broadcast', { event: 'turn_end' }, () => {
        setCurrentTurn(null);
      })
      .on('broadcast', { event: 'stream_token' }, ({ payload }) => {
        setStreamingContent(prev => prev + payload.token);
      })
      .on('broadcast', { event: 'stream_end' }, () => {
        setIsStreaming(false);
        setStreamingContent('');
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setSpectatorCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    queueChannel
      .on('broadcast', { event: 'queue_update' }, ({ payload }) => {
        setQueue(payload.queue);
      })
      .subscribe();

    // Fetch initial state
    fetch(`/api/queue/status?memberId=${member.id}${citizenId ? `&citizenId=${citizenId}` : ''}`)
      .then(res => res.json())
      .then(data => {
        setQueue(data.queue || []);
        setCurrentTurn(data.currentTurn || null);
      });

    return () => {
      channel.unsubscribe();
      queueChannel.unsubscribe();
    };
  }, [member.id, citizenId]);

  const queuePosition = citizenId
    ? queue.findIndex(e => e.citizenId === citizenId)
    : -1;

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

    return res.json();
  }, [member.id, citizenId]);

  const leaveQueue = useCallback(async () => {
    if (!citizenId) return;

    const res = await fetch('/api/queue/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id, citizenId }),
    });

    return res.json();
  }, [member.id, citizenId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!citizenId) return;

    const res = await fetch('/api/turn/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id, citizenId, content }),
    });

    return res.json();
  }, [member.id, citizenId]);

  return {
    messages,
    queue,
    queueLength: queue.length,
    queuePosition: queuePosition >= 0 ? queuePosition : null,
    currentTurn,
    isMyTurn,
    spectatorCount,
    isStreaming,
    streamingContent,
    raiseHand,
    leaveQueue,
    sendMessage,
  };
}
