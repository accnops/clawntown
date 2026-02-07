import type { QueueEntry } from '@clawntown/shared';
import { queryTownData, insertTownData, deleteTownData } from '../db/town-data.js';
import { broadcaster } from '../realtime/index.js';

export async function getQueue(memberId: string): Promise<QueueEntry[]> {
  const records = await queryTownData<QueueEntry>('queue_entry', {
    index_1: memberId,
  });

  return records
    .map(r => r.data)
    .sort((a, b) => a.joinedAt - b.joinedAt);
}

export async function joinQueue(
  memberId: string,
  citizenId: string,
  citizenName: string,
  citizenAvatar: string
): Promise<QueueEntry> {
  // Check if already in queue
  const existing = await queryTownData<QueueEntry>('queue_entry', {
    index_1: memberId,
    index_2: citizenId,
  });

  if (existing.length > 0) {
    throw new Error('Already in queue');
  }

  const entry: QueueEntry = {
    id: crypto.randomUUID(),
    citizenId,
    citizenName,
    citizenAvatar,
    joinedAt: Date.now(),
  };

  await insertTownData('queue_entry', entry, {
    index_1: memberId,
    index_2: citizenId,
  });

  // Broadcast queue update
  const queue = await getQueue(memberId);
  await broadcaster.broadcastQueueUpdate(memberId, queue);

  return entry;
}

export async function leaveQueue(memberId: string, citizenId: string): Promise<void> {
  const records = await queryTownData<QueueEntry>('queue_entry', {
    index_1: memberId,
    index_2: citizenId,
  });

  for (const record of records) {
    await deleteTownData(record.id);
  }

  // Broadcast queue update
  const queue = await getQueue(memberId);
  await broadcaster.broadcastQueueUpdate(memberId, queue);
}

export async function getNextInQueue(memberId: string): Promise<QueueEntry | null> {
  const queue = await getQueue(memberId);
  return queue[0] ?? null;
}

export async function removeFromQueue(
  memberId: string,
  citizenId: string
): Promise<void> {
  const records = await queryTownData<QueueEntry>('queue_entry', {
    index_1: memberId,
    index_2: citizenId,
  });

  for (const record of records) {
    await deleteTownData(record.id);
  }

  // Broadcast queue update
  const queue = await getQueue(memberId);
  await broadcaster.broadcastQueueUpdate(memberId, queue);
}
