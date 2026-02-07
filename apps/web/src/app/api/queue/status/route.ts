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

    // Get citizen's position if citizenId provided
    let position: number | null = null;
    if (citizenId) {
      const { data: pos } = await supabase
        .rpc('get_queue_position', { p_member_id: memberId, p_citizen_id: citizenId });

      // Check if citizen is in queue
      const isInQueue = queue?.some(e => e.citizen_id === citizenId);
      position = isInQueue ? (pos ?? 0) : null;
    }

    return NextResponse.json({
      queue: queue || [],
      queueLength: queue?.length ?? 0,
      position,
      currentTurn,
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json({ error: 'Failed to get queue status' }, { status: 500 });
  }
}
