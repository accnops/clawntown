import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { memberId, citizenId } = await request.json();

    if (!memberId || !citizenId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Delete the queue entry (or mark as completed)
    const { error: deleteError } = await supabase
      .from('queue_entries')
      .delete()
      .eq('member_id', memberId)
      .eq('citizen_id', citizenId)
      .eq('status', 'waiting');

    if (deleteError) {
      console.error('Error deleting queue entry:', deleteError);
      return NextResponse.json({ error: 'Failed to leave queue' }, { status: 500 });
    }

    // Get updated queue length
    const { data: queueLength } = await supabase
      .rpc('get_queue_length', { p_member_id: memberId });

    // Broadcast queue update so other users see the change
    const channel = supabase.channel(`council:${memberId}`);
    await channel.httpSend('queue_updated', {
      queueLength: queueLength ?? 0,
    });

    return NextResponse.json({
      success: true,
      queueLength: queueLength ?? 0,
    });
  } catch (error) {
    console.error('Error leaving queue:', error);
    return NextResponse.json({ error: 'Failed to leave queue' }, { status: 500 });
  }
}
