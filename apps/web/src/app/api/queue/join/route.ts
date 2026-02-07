import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { memberId, citizenId } = await request.json();

    if (!memberId || !citizenId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if already in queue (unique index will also prevent this)
    const { data: existing } = await supabase
      .from('queue_entries')
      .select('id')
      .eq('member_id', memberId)
      .eq('citizen_id', citizenId)
      .eq('status', 'waiting')
      .single();

    if (existing) {
      return NextResponse.json({ error: 'Already in queue' }, { status: 400 });
    }

    // Add to queue
    const { data: entry, error: insertError } = await supabase
      .from('queue_entries')
      .insert({
        member_id: memberId,
        citizen_id: citizenId,
        status: 'waiting',
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting queue entry:', insertError);
      return NextResponse.json({ error: 'Failed to join queue' }, { status: 500 });
    }

    // Get position using the helper function
    const { data: position } = await supabase
      .rpc('get_queue_position', { p_member_id: memberId, p_citizen_id: citizenId });

    // Get queue length
    const { data: queueLength } = await supabase
      .rpc('get_queue_length', { p_member_id: memberId });

    return NextResponse.json({
      entry,
      position: position ?? 0,
      queueLength: queueLength ?? 1,
    });
  } catch (error) {
    console.error('Error joining queue:', error);
    return NextResponse.json({ error: 'Failed to join queue' }, { status: 500 });
  }
}
