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
    const { memberId, citizenId } = await request.json();

    if (!memberId || !citizenId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const queueKey = KV_KEYS.queue(memberId);

    // Get current queue
    const queue = await kv.lrange<QueueEntry>(queueKey, 0, -1);

    // Filter out the citizen
    const updatedQueue = queue.filter(e => e.citizenId !== citizenId);

    // Replace queue (delete and re-add)
    await kv.del(queueKey);
    if (updatedQueue.length > 0) {
      await kv.rpush(queueKey, ...updatedQueue);
    }

    // Broadcast queue update
    await supabase.channel(`council:${memberId}:queue`).send({
      type: 'broadcast',
      event: 'queue_update',
      payload: { queue: updatedQueue, memberId },
    });

    return NextResponse.json({ success: true, queueLength: updatedQueue.length });
  } catch (error) {
    console.error('Error leaving queue:', error);
    return NextResponse.json({ error: 'Failed to leave queue' }, { status: 500 });
  }
}
