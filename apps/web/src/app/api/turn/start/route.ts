import { NextRequest, NextResponse } from 'next/server';
import { kv, KV_KEYS } from '@/lib/kv';
import { createClient } from '@supabase/supabase-js';
import type { QueueEntry, CitizenTurn } from '@clawntown/shared';

const CHAR_BUDGET = 500;
const TIME_BUDGET_MS = 20000;
const MESSAGE_LIMIT = 2;

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    const turnKey = KV_KEYS.turn(memberId);
    const queueKey = KV_KEYS.queue(memberId);
    const sessionKey = KV_KEYS.session(memberId);

    // Check if there's already an active turn
    const existingTurn = await kv.get<CitizenTurn>(turnKey);
    if (existingTurn && existingTurn.status === 'active') {
      return NextResponse.json({ error: 'Turn already in progress' }, { status: 400 });
    }

    // Get the queue to find the next citizen
    const queue = await kv.lrange<QueueEntry>(queueKey, 0, -1);
    if (queue.length === 0) {
      return NextResponse.json({ error: 'Queue is empty' }, { status: 400 });
    }

    // Get the first person in line
    const nextCitizen = queue[0];

    // Get or create session ID
    let sessionId = await kv.get<string>(sessionKey);
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      await kv.set(sessionKey, sessionId);
    }

    // Create the turn
    const turn: CitizenTurn = {
      id: crypto.randomUUID(),
      sessionId,
      memberId,
      citizenId: nextCitizen.citizenId,
      citizenName: nextCitizen.citizenName,
      charsUsed: 0,
      charBudget: CHAR_BUDGET,
      timeUsedMs: 0,
      timeBudgetMs: TIME_BUDGET_MS,
      messagesUsed: 0,
      messageLimit: MESSAGE_LIMIT,
      startedAt: Date.now(),
      status: 'active',
    };

    // Save turn to KV
    await kv.set(turnKey, turn);

    // Remove citizen from queue (lpop removes the first element)
    await kv.lpop(queueKey);

    // Get updated queue
    const updatedQueue = await kv.lrange<QueueEntry>(queueKey, 0, -1);

    // Broadcast turn_start event
    await supabase.channel(`council:${memberId}:turn`).send({
      type: 'broadcast',
      event: 'turn_start',
      payload: { turn, memberId },
    });

    // Broadcast queue_update event
    await supabase.channel(`council:${memberId}:queue`).send({
      type: 'broadcast',
      event: 'queue_update',
      payload: { queue: updatedQueue, memberId },
    });

    return NextResponse.json({ turn, queueLength: updatedQueue.length });
  } catch (error) {
    console.error('Error starting turn:', error);
    return NextResponse.json({ error: 'Failed to start turn' }, { status: 500 });
  }
}
