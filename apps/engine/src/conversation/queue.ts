import type { QueueEntry } from '@clawntawn/shared';
import { queryTownData, insertTownData, updateTownData, deleteTownData } from '../db/town-data.js';
import { broadcaster } from '../realtime/index.js';

export async function getQueue(memberId: string): Promise<QueueEntry[]> {
  const records = await queryTownData<QueueEntry>('queue_entry', {
    index_1: memberId,
    index_3: 'waiting'
  });

  return records
    .map(r => r.data)
    .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
}

export async function joinQueue(memberId: string, citizenId: string): Promise<QueueEntry> {
  // Check if already in queue
  const existing = await queryTownData<QueueEntry>('queue_entry', {
    index_1: memberId,
    index_2: citizenId,
    index_3: 'waiting'
  });

  if (existing.length > 0) {
    throw new Error('Already in queue');
  }

  const entry: QueueEntry = {
    id: crypto.randomUUID(),
    citizenId,
    joinedAt: new Date(),
    status: 'waiting',
  };

  await insertTownData('queue_entry', entry, {
    index_1: memberId,
    index_2: citizenId,
    index_3: 'waiting',
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
    index_3: 'waiting'
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

export async function markQueueEntryActive(
  memberId: string,
  citizenId: string
): Promise<void> {
  const records = await queryTownData<QueueEntry>('queue_entry', {
    index_1: memberId,
    index_2: citizenId,
    index_3: 'waiting'
  });

  for (const record of records) {
    await updateTownData(record.id, { ...record.data, status: 'active' }, { index_3: 'active' });
  }
}

export async function markQueueEntryCompleted(
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
