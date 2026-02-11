import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { isCouncilMemberOnline } from '@/data/council-members';
import { runCleanupIfNeeded } from '@/lib/cleanup';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { memberId, citizenId } = await request.json();

    if (!memberId || !citizenId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Run global cleanup (cached - at most every 20 seconds)
    await runCleanupIfNeeded();

    // Zero-trust: Check if council member is actually online right now
    const now = new Date();
    if (!isCouncilMemberOnline({ id: memberId, schedule: [] } as never, now)) {
      // Need to get the actual member to check schedule
      const { getCouncilMember } = await import('@/data/council-members');
      const member = getCouncilMember(memberId);

      if (!member || !isCouncilMemberOnline(member, now)) {
        // Council member is offline - close any active session
        await supabase
          .from('conversation_sessions')
          .update({ status: 'ended', ended_at: now.toISOString() })
          .eq('member_id', memberId)
          .eq('status', 'active');

        // Skip all waiting queue entries
        await supabase
          .from('queue_entries')
          .update({ status: 'skipped' })
          .eq('member_id', memberId)
          .in('status', ['waiting', 'ready_check', 'confirmed']);

        return NextResponse.json({
          error: 'Council member is offline',
          offline: true,
        }, { status: 400 });
      }
    }

    // Call the atomic queue progression function
    const { data, error } = await (supabase.rpc as CallableFunction)('progress_queue', {
      p_member_id: memberId,
      p_citizen_id: citizenId,
      p_heartbeat_stale_seconds: 180, // 3 minutes
    });

    if (error) {
      console.error('Error in progress_queue:', error);
      return NextResponse.json({ error: 'Failed to process heartbeat' }, { status: 500 });
    }

    const result = (data as Record<string, unknown>[] | null)?.[0] as {
      action: string;
      turn_id: string | null;
      turn_started: boolean;
      queue_position: number | null;
      queue_length: number;
      next_heartbeat_ms: number | null;
    } | undefined;
    if (!result) {
      return NextResponse.json({ error: 'No result from queue progression' }, { status: 500 });
    }

    // Fetch current turn info (for UI state sync)
    const { data: currentTurn } = await supabase
      .from('turns')
      .select('*, citizens:citizen_id(name, avatar)')
      .eq('member_id', memberId)
      .is('ended_at', null)
      .maybeSingle();

    // If a turn was started by this heartbeat, broadcast it
    if (result.turn_started && result.turn_id) {
      const { data: turn } = await supabase
        .from('turns')
        .select('*')
        .eq('id', result.turn_id)
        .single();

      if (turn) {
        const channel = supabase.channel(`council:${memberId}`);
        await channel.httpSend('turn_started', {
          turn,
          queueLength: result.queue_length ?? 0,
        });
      }
    }

    return NextResponse.json({
      action: result.action,
      turnStarted: result.turn_started,
      turnId: result.turn_id,
      position: result.queue_position,
      queueLength: result.queue_length,
      nextHeartbeatMs: result.next_heartbeat_ms,
      // Include current turn for UI sync
      currentTurn: currentTurn ? {
        id: currentTurn.id,
        citizenId: currentTurn.citizen_id,
        citizenName: currentTurn.citizens?.name || null,
        citizenAvatar: currentTurn.citizens?.avatar || null,
        expiresAt: currentTurn.expires_at,
        messagesUsed: currentTurn.messages_used,
        messageLimit: currentTurn.message_limit,
      } : null,
    });
  } catch (error) {
    console.error('Error processing heartbeat:', error);
    return NextResponse.json({ error: 'Failed to process heartbeat' }, { status: 500 });
  }
}
