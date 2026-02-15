import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const citizenId = searchParams.get('citizenId');

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    // Get queue entries for this member
    const { data: queue, error: queueError } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('member_id', memberId)
      .eq('status', 'waiting')
      .order('joined_at', { ascending: true });

    if (queueError) {
      console.error('Error fetching queue:', queueError);
      return NextResponse.json({ error: 'Failed to get queue' }, { status: 500 });
    }

    // Get current active turn for this member
    const { data: currentTurn } = await supabase
      .from('turns')
      .select('*')
      .eq('member_id', memberId)
      .is('ended_at', null)
      .single();

    // Get active session and recent messages
    let { data: session } = await supabase
      .from('conversation_sessions')
      .select('id, started_at')
      .eq('member_id', memberId)
      .eq('status', 'active')
      .single();

    // Close stale sessions (older than max slot duration of 8 hours)
    const maxSlotDurationMs = 8 * 60 * 60 * 1000;
    if (session && Date.now() - new Date(session.started_at).getTime() > maxSlotDurationMs) {
      await supabase
        .from('conversation_sessions')
        .update({ status: 'ended', ended_at: new Date().toISOString() })
        .eq('id', session.id);
      session = null;
    }

    let messages: unknown[] = [];
    if (session) {
      const { data: recentMessages } = await supabase
        .from('conversation_messages')
        .select('*')
        .eq('session_id', session.id)
        .order('seq', { ascending: true })
        .limit(50);  // Load last 50 messages
      messages = recentMessages || [];
    }

    // Get citizen's position if citizenId provided (convert 0-indexed to 1-indexed)
    let position: number | null = null;
    if (citizenId) {
      const { data: pos } = await supabase
        .rpc('get_queue_position', { p_member_id: memberId, p_citizen_id: citizenId });

      // Check if citizen is in queue
      const isInQueue = queue?.some(e => e.citizen_id === citizenId);
      position = isInQueue ? (pos ?? 0) + 1 : null;
    }

    return NextResponse.json({
      queue: queue || [],
      queueLength: queue?.length ?? 0,
      position,
      currentTurn,
      messages,
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json({ error: 'Failed to get queue status' }, { status: 500 });
  }
}
