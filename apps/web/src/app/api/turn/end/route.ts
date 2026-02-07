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

    return NextResponse.json({
      turn: endedTurn,
      reason: reason || 'completed',
    });
  } catch (error) {
    console.error('Error ending turn:', error);
    return NextResponse.json({ error: 'Failed to end turn' }, { status: 500 });
  }
}
