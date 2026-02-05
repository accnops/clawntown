'use client';

import { useState, useEffect, useCallback } from 'react';
import { subscribeBroadcast } from '@/lib/supabase';

interface QueueEntry {
  id: string;
  citizenId: string;
  citizenName: string;
  citizenAvatar?: string;
  joinedAt: Date;
  status: 'waiting' | 'active';
}

interface QueueUpdatePayload {
  memberId: string;
  queue: QueueEntry[];
}

export function useQueue(memberId: string) {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Subscribe to queue updates
  useEffect(() => {
    const subscription = subscribeBroadcast<QueueUpdatePayload>(
      'queue',
      'update',
      (payload) => {
        if (payload.memberId === memberId) {
          setQueue(payload.queue);
          setIsLoading(false);
        }
      }
    );

    // Initial load would normally fetch from DB
    // For now, just mark as loaded
    setIsLoading(false);

    return () => {
      subscription.unsubscribe();
    };
  }, [memberId]);

  // Get queue position for a citizen
  const getPosition = useCallback(
    (citizenId: string) => {
      const waitingQueue = queue.filter((e) => e.status === 'waiting');
      return waitingQueue.findIndex((e) => e.citizenId === citizenId);
    },
    [queue]
  );

  // Check if citizen is in queue
  const isInQueue = useCallback(
    (citizenId: string) => {
      return queue.some((e) => e.citizenId === citizenId);
    },
    [queue]
  );

  // Check if it's the citizen's turn
  const isMyTurn = useCallback(
    (citizenId: string) => {
      return queue.some((e) => e.citizenId === citizenId && e.status === 'active');
    },
    [queue]
  );

  // Get active entry
  const activeEntry = queue.find((e) => e.status === 'active');

  // Get waiting count
  const waitingCount = queue.filter((e) => e.status === 'waiting').length;

  return {
    queue,
    isLoading,
    getPosition,
    isInQueue,
    isMyTurn,
    activeEntry,
    waitingCount,
  };
}
