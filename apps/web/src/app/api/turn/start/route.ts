import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCouncilMember, isCouncilMemberOnline } from '@/data/council-members';

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

    // Zero-trust: verify council member is online right now
    const member = getCouncilMember(memberId);
    if (!member || !isCouncilMemberOnline(member)) {
      return NextResponse.json({ error: 'Council member is offline' }, { status: 400 });
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

    // Skip stale queue entries (no heartbeat in last 3 minutes)
    const staleThreshold = new Date(Date.now() - 3 * 60 * 1000).toISOString();
    await supabase
      .from('queue_entries')
      .update({ status: 'skipped' })
      .eq('member_id', memberId)
      .eq('status', 'waiting')
      .or(`last_heartbeat_at.is.null,last_heartbeat_at.lt.${staleThreshold}`);

    // Get the first person in queue with valid heartbeat
    const { data: nextInQueue, error: queueError } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('member_id', memberId)
      .eq('status', 'waiting')
      .gte('last_heartbeat_at', staleThreshold)
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

    // Safety check: close stale sessions (older than 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (session && new Date(session.started_at) < twentyFourHoursAgo) {
      await supabase
        .from('conversation_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', session.id);
      session = null;
    }

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

    // Get citizen info for the turn
    const { data: citizen } = await supabase
      .from('citizens')
      .select('name, avatar')
      .eq('id', nextInQueue.citizen_id)
      .single();

    // Enrich turn with citizen info for broadcast
    const enrichedTurn = {
      ...turn,
      citizen_name: citizen?.name || nextInQueue.citizen_name || 'Citizen',
      citizen_avatar: citizen?.avatar || nextInQueue.citizen_avatar || null,
    };

    // Get updated queue length
    const { data: queueLength } = await supabase
      .rpc('get_queue_length', { p_member_id: memberId });

    // Broadcast turn_started to all spectators
    const channel = supabase.channel(`council:${memberId}`);
    await channel.httpSend('turn_started', {
      turn: enrichedTurn,
      queueLength: queueLength ?? 0,
    });

    return NextResponse.json({
      turn: enrichedTurn,
      session,
      queueLength: queueLength ?? 0,
    });
  } catch (error) {
    console.error('Error starting turn:', error);
    return NextResponse.json({ error: 'Failed to start turn' }, { status: 500 });
  }
}
