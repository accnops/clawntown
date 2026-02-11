import { unstable_cache } from 'next/cache';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { COUNCIL_MEMBERS, isCouncilMemberOnline } from '@/data/council-members';

async function performCleanup(): Promise<{ cleaned: number; timestamp: number }> {
  const supabase = getSupabaseAdmin();
  const now = new Date();
  let cleaned = 0;

  // 1. Clean up expired turns across ALL members
  const { data: expiredTurns } = await supabase
    .from('turns')
    .select('id, member_id, citizen_id')
    .is('ended_at', null)
    .lt('expires_at', now.toISOString());

  for (const turn of expiredTurns || []) {
    // End the expired turn
    await supabase
      .from('turns')
      .update({ ended_at: now.toISOString() })
      .eq('id', turn.id);

    // Mark queue entry as completed
    await supabase
      .from('queue_entries')
      .update({ status: 'completed' })
      .eq('citizen_id', turn.citizen_id)
      .eq('member_id', turn.member_id)
      .eq('status', 'active');

    // Broadcast turn ended
    const { data: queueLength } = await supabase
      .rpc('get_queue_length', { p_member_id: turn.member_id });

    const channel = supabase.channel(`council:${turn.member_id}`);
    await channel.httpSend('turn_ended', {
      endedTurn: turn,
      nextTurn: null,
      queueLength: queueLength ?? 0,
    });

    cleaned++;
  }

  // 2. Close sessions for offline council members
  for (const member of COUNCIL_MEMBERS) {
    if (isCouncilMemberOnline(member, now)) continue;

    // Check if there's an active session that should be closed
    const { data: session } = await supabase
      .from('conversation_sessions')
      .select('id')
      .eq('member_id', member.id)
      .eq('status', 'active')
      .maybeSingle();

    if (session) {
      // End any active turn
      await supabase
        .from('turns')
        .update({ ended_at: now.toISOString() })
        .eq('member_id', member.id)
        .is('ended_at', null);

      // Skip all waiting queue entries
      await supabase
        .from('queue_entries')
        .update({ status: 'skipped' })
        .eq('member_id', member.id)
        .in('status', ['waiting', 'ready_check', 'confirmed']);

      // Close the session
      await supabase
        .from('conversation_sessions')
        .update({ status: 'ended', ended_at: now.toISOString() })
        .eq('id', session.id);

      cleaned++;
    }
  }

  // 3. Skip stale queue entries (no heartbeat in 3+ minutes)
  const staleThreshold = new Date(now.getTime() - 3 * 60 * 1000).toISOString();
  const { data: staleEntries } = await supabase
    .from('queue_entries')
    .update({ status: 'skipped' })
    .eq('status', 'waiting')
    .or(`last_heartbeat_at.is.null,last_heartbeat_at.lt.${staleThreshold}`)
    .select('id');

  cleaned += staleEntries?.length ?? 0;

  return { cleaned, timestamp: now.getTime() };
}

// Cached cleanup - runs at most every 20 seconds
export const runCleanupIfNeeded = unstable_cache(
  performCleanup,
  ['queue-cleanup'],
  { revalidate: 20 }
);
