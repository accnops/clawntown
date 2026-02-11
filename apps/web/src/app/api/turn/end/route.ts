import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { memberId, reason } = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    // Get current turn
    const { data: turn, error: turnError } = await supabase
      .from('turns')
      .select('*')
      .eq('member_id', memberId)
      .is('ended_at', null)
      .single();

    if (turnError || !turn) {
      return NextResponse.json({ error: 'No active turn' }, { status: 400 });
    }

    // End the turn
    const { data: endedTurn, error: updateError } = await supabase
      .from('turns')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', turn.id)
      .select()
      .single();

    if (updateError) {
      console.error('Error ending turn:', updateError);
      return NextResponse.json({ error: 'Failed to end turn' }, { status: 500 });
    }

    // Update queue entry to completed
    await supabase
      .from('queue_entries')
      .update({ status: 'completed' })
      .eq('citizen_id', turn.citizen_id)
      .eq('member_id', memberId)
      .eq('status', 'active');

    // Auto-start next turn if there's someone waiting
    let nextTurn = null;
    const { data: nextInQueue } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('member_id', memberId)
      .eq('status', 'waiting')
      .order('joined_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextInQueue) {
      // Start the next person's turn
      try {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3002');
        const startRes = await fetch(new URL('/api/turn/start', baseUrl), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId }),
        });

        if (startRes.ok) {
          const startData = await startRes.json();
          nextTurn = startData.turn;
        }
      } catch (e) {
        console.error('Error auto-starting next turn:', e);
      }
    }

    // Get updated queue length for broadcast
    const { data: queueLength } = await supabase
      .rpc('get_queue_length', { p_member_id: memberId });

    // Broadcast turn_ended to all spectators
    const channel = supabase.channel(`council:${memberId}`);
    await channel.httpSend('turn_ended', {
      endedTurn,
      nextTurn,
      queueLength: queueLength ?? 0,
    });

    return NextResponse.json({
      turn: endedTurn,
      reason: reason || 'completed',
      nextTurn,
    });
  } catch (error) {
    console.error('Error ending turn:', error);
    return NextResponse.json({ error: 'Failed to end turn' }, { status: 500 });
  }
}
