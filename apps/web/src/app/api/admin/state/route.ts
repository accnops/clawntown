import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { COUNCIL_MEMBERS, isCouncilMemberOnline } from '@/data/council-members';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const now = new Date();

    // Get all active turns
    const { data: activeTurns } = await supabase
      .from('turns')
      .select('*, citizens:citizen_id(name, avatar)')
      .is('ended_at', null);

    // Get all waiting queue entries
    const { data: waitingEntries } = await supabase
      .from('queue_entries')
      .select('*, citizens:citizen_id(name, avatar)')
      .eq('status', 'waiting')
      .order('joined_at', { ascending: true });

    // Get all active queue entries (people currently chatting)
    const { data: activeEntries } = await supabase
      .from('queue_entries')
      .select('*, citizens:citizen_id(name, avatar)')
      .eq('status', 'active');

    // Build state per council member
    const memberStates = COUNCIL_MEMBERS.map(member => {
      const isOnline = isCouncilMemberOnline(member, now);
      const activeTurn = activeTurns?.find(t => t.member_id === member.id);
      const queue = waitingEntries?.filter(e => e.member_id === member.id) || [];
      const activeEntry = activeEntries?.find(e => e.member_id === member.id);

      return {
        memberId: member.id,
        memberName: member.name,
        isOnline,
        schedule: member.schedule,
        currentTurn: activeTurn ? {
          visitorName: activeTurn.citizens?.name || 'Unknown',
          visitorAvatar: activeTurn.citizens?.avatar || null,
          citizenId: activeTurn.citizen_id,
          startedAt: activeTurn.started_at,
          expiresAt: activeTurn.expires_at,
          messagesUsed: activeTurn.messages_used,
          messageLimit: activeTurn.message_limit,
          charsUsed: activeTurn.chars_used,
          charBudget: activeTurn.char_budget,
          timeRemainingMs: Math.max(0, new Date(activeTurn.expires_at).getTime() - now.getTime()),
        } : null,
        activeQueueEntry: activeEntry ? {
          visitorName: activeEntry.citizens?.name || 'Unknown',
          citizenId: activeEntry.citizen_id,
          joinedAt: activeEntry.joined_at,
          lastHeartbeat: activeEntry.last_heartbeat_at,
        } : null,
        queue: queue.map((entry, index) => ({
          position: index,
          visitorName: entry.citizens?.name || 'Unknown',
          visitorAvatar: entry.citizens?.avatar || null,
          citizenId: entry.citizen_id,
          joinedAt: entry.joined_at,
          lastHeartbeat: entry.last_heartbeat_at,
          heartbeatAgeSeconds: entry.last_heartbeat_at
            ? Math.round((now.getTime() - new Date(entry.last_heartbeat_at).getTime()) / 1000)
            : null,
        })),
        queueLength: queue.length,
        nextInLine: queue[0] ? {
          visitorName: queue[0].citizens?.name || 'Unknown',
          citizenId: queue[0].citizen_id,
          waitingSince: queue[0].joined_at,
        } : null,
      };
    });

    // Summary stats
    const summary = {
      timestamp: now.toISOString(),
      totalOnlineMembers: memberStates.filter(m => m.isOnline).length,
      totalActiveTurns: activeTurns?.length || 0,
      totalWaiting: waitingEntries?.length || 0,
      membersWithActivity: memberStates.filter(m => m.currentTurn || m.queueLength > 0).map(m => m.memberId),
    };

    return NextResponse.json({
      summary,
      members: memberStates,
    });
  } catch (error) {
    console.error('Error fetching admin state:', error);
    return NextResponse.json({ error: 'Failed to fetch state' }, { status: 500 });
  }
}
