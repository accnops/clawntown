import { NextRequest, NextResponse } from 'next/server';
import { queryTownData, updateTownData } from '@/lib/supabase';
import type { CitizenTurn, QueueEntry } from '@clawntown/shared';

// Vercel Cron - runs every minute
export const dynamic = 'force-dynamic';

const TURN_TIMEOUT_MS = 20 * 1000; // 20 seconds
const READY_CHECK_TIMEOUT_MS = 30 * 1000; // 30 seconds

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const results: string[] = [];

  // 1. Clean up timed-out turns
  const activeTurns = await queryTownData<CitizenTurn>('conversation_turn', {
    index_3: 'active',
  });

  for (const turn of activeTurns) {
    const startedAt = new Date(turn.data.startedAt);
    const timeoutAt = new Date(startedAt.getTime() + TURN_TIMEOUT_MS);

    if (now > timeoutAt) {
      await updateTownData(turn.id, {
        ...turn.data,
        status: 'expired',
      });

      results.push(`Turn ${turn.id} timed out`);
    }
  }

  // 2. Clean up expired ready checks
  const readyCheckEntries = await queryTownData<QueueEntry>('queue_entry', {
    index_3: 'ready_check',
  });

  for (const entry of readyCheckEntries) {
    if (!entry.data.readyCheckSentAt) continue;

    const expiresAt = new Date(
      new Date(entry.data.readyCheckSentAt).getTime() + READY_CHECK_TIMEOUT_MS
    );

    if (now > expiresAt) {
      await updateTownData(entry.id, {
        ...entry.data,
        status: 'skipped',
      });

      results.push(`Ready check expired for ${entry.data.citizenName}`);
    }
  }

  return NextResponse.json({ processed: results, timestamp: now.toISOString() });
}
