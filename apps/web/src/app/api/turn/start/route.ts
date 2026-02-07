import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

const CHAR_BUDGET = 500;
const TIME_BUDGET_MS = 20000;
const MESSAGE_LIMIT = 2;

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    // Check if there's already an active turn
    const { data: existingTurn } = await supabase
      .from('turns')
      .select('*')
      .eq('member_id', memberId)
      .is('ended_at', null)
      .single();

    if (existingTurn) {
      return NextResponse.json({ error: 'Turn already in progress' }, { status: 400 });
    }

    // Get the first person in queue
    const { data: nextInQueue, error: queueError } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('member_id', memberId)
      .eq('status', 'waiting')
      .order('joined_at', { ascending: true })
      .limit(1)
      .single();

    if (queueError || !nextInQueue) {
      return NextResponse.json({ error: 'Queue is empty' }, { status: 400 });
    }

    // Get or create active session for this member
    let { data: session } = await supabase
      .from('conversation_sessions')
      .select('*')
      .eq('member_id', memberId)
      .eq('status', 'active')
      .single();

    if (!session) {
      // Create a new session
      const { data: newSession, error: sessionError } = await supabase
        .from('conversation_sessions')
        .insert({
          member_id: memberId,
          status: 'active',
        })
        .select()
        .single();

      if (sessionError) {
        console.error('Error creating session:', sessionError);
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
      }
      session = newSession;
    }

    // Calculate expires_at (20 seconds from now)
    const now = new Date();
    const expiresAt = new Date(now.getTime() + TIME_BUDGET_MS);

    // Create the turn
    const { data: turn, error: turnError } = await supabase
      .from('turns')
      .insert({
        member_id: memberId,
        session_id: session.id,
        citizen_id: nextInQueue.citizen_id,
        chars_used: 0,
        char_budget: CHAR_BUDGET,
        messages_used: 0,
        message_limit: MESSAGE_LIMIT,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (turnError) {
      console.error('Error creating turn:', turnError);
      return NextResponse.json({ error: 'Failed to create turn' }, { status: 500 });
    }

    // Update queue entry status to 'active'
    await supabase
      .from('queue_entries')
      .update({ status: 'active' })
      .eq('id', nextInQueue.id);

    // Get updated queue length
    const { data: queueLength } = await supabase
      .rpc('get_queue_length', { p_member_id: memberId });

    return NextResponse.json({
      turn,
      session,
      queueLength: queueLength ?? 0,
    });
  } catch (error) {
    console.error('Error starting turn:', error);
    return NextResponse.json({ error: 'Failed to start turn' }, { status: 500 });
  }
}
