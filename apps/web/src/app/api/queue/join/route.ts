import { NextRequest, NextResponse } from 'next/server';
import { kv, KV_KEYS } from '@/lib/kv';
import { createClient } from '@supabase/supabase-js';
import type { QueueEntry } from '@clawntown/shared';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { memberId, citizenId, citizenName, citizenAvatar } = await request.json();

    if (!memberId || !citizenId || !citizenName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const queueKey = KV_KEYS.queue(memberId);

    // Check if already in queue
    const existingQueue = await kv.lrange<QueueEntry>(queueKey, 0, -1);
    if (existingQueue.some(e => e.citizenId === citizenId)) {
      return NextResponse.json({ error: 'Already in queue' }, { status: 400 });
    }

    // Add to queue
    const entry: QueueEntry = {
      id: crypto.randomUUID(),
      citizenId,
      citizenName,
      citizenAvatar,
      joinedAt: Date.now(),
    };

    await kv.rpush(queueKey, entry);

    // Get updated queue for position
    const queue = await kv.lrange<QueueEntry>(queueKey, 0, -1);
    const position = queue.findIndex(e => e.citizenId === citizenId);

    // Broadcast queue update via Supabase
    await supabase.channel(`council:${memberId}:queue`).send({
      type: 'broadcast',
      event: 'queue_update',
      payload: { queue, memberId },
    });

    return NextResponse.json({ entry, position, queueLength: queue.length });
  } catch (error) {
    console.error('Error joining queue:', error);
    return NextResponse.json({ error: 'Failed to join queue' }, { status: 500 });
  }
}
