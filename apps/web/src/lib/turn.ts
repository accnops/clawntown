import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCouncilMember, isCouncilMemberOnline } from '@/data/council-members';

const CHAR_BUDGET = 256;
const TIME_BUDGET_MS = 10000;
const MESSAGE_LIMIT = 1;

export interface StartTurnResult {
  success: boolean;
  error?: string;
  turn?: Record<string, unknown>;
  session?: Record<string, unknown>;
  queueLength?: number;
}

/**
 * Start the next turn for a council member.
 * This is called after a turn ends to auto-start the next person in queue.
 */
export async function startNextTurn(memberId: string): Promise<StartTurnResult> {
  const supabase = getSupabaseAdmin();

  // Verify council member is online
  const member = getCouncilMember(memberId);
  if (!member || !isCouncilMemberOnline(member)) {
    return { success: false, error: 'Council member is offline' };
  }

  // Check if there's already an active turn
  const { data: existingTurn } = await supabase
    .from('turns')
    .select('*')
    .eq('member_id', memberId)
    .is('ended_at', null)
    .single();

  if (existingTurn) {
    return { success: false, error: 'Turn already in progress' };
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
    return { success: false, error: 'Queue is empty' };
  }

  // Get or create active session for this member
  let { data: session } = await supabase
    .from('conversation_sessions')
    .select('*')
    .eq('member_id', memberId)
    .eq('status', 'active')
    .single();

  // Safety check: close stale sessions (older than max slot duration of 8 hours)
  const maxSlotDurationMs = 8 * 60 * 60 * 1000;
  if (session && Date.now() - new Date(session.started_at).getTime() > maxSlotDurationMs) {
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
      return { success: false, error: 'Failed to create session' };
    }
    session = newSession;
  }

  // Calculate expires_at
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
    return { success: false, error: 'Failed to create turn' };
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
    citizen_name: citizen?.name || 'Citizen',
    citizen_avatar: citizen?.avatar || null,
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

  return {
    success: true,
    turn: enrichedTurn,
    session,
    queueLength: queueLength ?? 0,
  };
}
