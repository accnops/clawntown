import { NextRequest, NextResponse } from 'next/server';
import { kv, KV_KEYS } from '@/lib/kv';
import type { QueueEntry, CitizenTurn } from '@clawntown/shared';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const citizenId = searchParams.get('citizenId');

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    const queueKey = KV_KEYS.queue(memberId);
    const turnKey = KV_KEYS.turn(memberId);

    const [queue, currentTurn] = await Promise.all([
      kv.lrange<QueueEntry>(queueKey, 0, -1),
      kv.get<CitizenTurn>(turnKey),
    ]);

    let position: number | null = null;
    if (citizenId) {
      const idx = queue.findIndex(e => e.citizenId === citizenId);
      position = idx >= 0 ? idx : null;
    }

    return NextResponse.json({
      queue,
      queueLength: queue.length,
      position,
      currentTurn,
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json({ error: 'Failed to get queue status' }, { status: 500 });
  }
}
