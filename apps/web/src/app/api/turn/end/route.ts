import { NextRequest, NextResponse } from 'next/server';
import { kv, KV_KEYS } from '@/lib/kv';
import { createClient } from '@supabase/supabase-js';
import type { CitizenTurn } from '@clawntown/shared';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { memberId, reason } = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    const turnKey = KV_KEYS.turn(memberId);

    // Get current turn
    const turn = await kv.get<CitizenTurn>(turnKey);
    if (!turn) {
      return NextResponse.json({ error: 'No active turn' }, { status: 400 });
    }

    // Update turn status based on reason
    const endedTurn: CitizenTurn = {
      ...turn,
      status: reason === 'timeout' ? 'expired' : 'completed',
    };

    // Delete turn from KV
    await kv.del(turnKey);

    // Broadcast turn_end event
    await supabase.channel(`council:${memberId}:turn`).send({
      type: 'broadcast',
      event: 'turn_end',
      payload: { turn: endedTurn, memberId, reason },
    });

    return NextResponse.json({ turn: endedTurn });
  } catch (error) {
    console.error('Error ending turn:', error);
    return NextResponse.json({ error: 'Failed to end turn' }, { status: 500 });
  }
}
