import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

const READY_CHECK_TIMEOUT_MS = 30 * 1000; // 30 seconds
const AUTO_CONFIRM_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { memberId, citizenId, action } = await request.json();

    if (!memberId || !citizenId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the queue entry
    const { data: entry, error: fetchError } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('member_id', memberId)
      .eq('citizen_id', citizenId)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json(
        { error: 'Queue entry not found' },
        { status: 404 }
      );
    }

    if (action === 'confirm') {
      // Citizen confirms they're ready
      const { error: updateError } = await supabase
        .from('queue_entries')
        .update({
          status: 'confirmed',
          confirmed_ready: true,
          confirmed_at: new Date().toISOString(),
        })
        .eq('id', entry.id);

      if (updateError) {
        console.error('Error confirming ready check:', updateError);
        return NextResponse.json(
          { error: 'Failed to confirm ready' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, status: 'confirmed' });
    }

    if (action === 'skip') {
      // Citizen didn't confirm in time, skip them
      const { error: updateError } = await supabase
        .from('queue_entries')
        .update({
          status: 'skipped',
        })
        .eq('id', entry.id);

      if (updateError) {
        console.error('Error skipping queue entry:', updateError);
        return NextResponse.json(
          { error: 'Failed to skip' },
          { status: 500 }
        );
      }

      return NextResponse.json({ success: true, status: 'skipped' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing ready check:', error);
    return NextResponse.json(
      { error: 'Failed to process ready check' },
      { status: 500 }
    );
  }
}

// Called by queue advancement logic to initiate ready check
export async function PUT(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { memberId, citizenId } = await request.json();

    if (!memberId || !citizenId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Find the queue entry
    const { data: entry, error: fetchError } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('member_id', memberId)
      .eq('citizen_id', citizenId)
      .single();

    if (fetchError || !entry) {
      return NextResponse.json(
        { error: 'Queue entry not found' },
        { status: 404 }
      );
    }

    const joinedAt = new Date(entry.joined_at);
    const now = new Date();
    const waitTime = now.getTime() - joinedAt.getTime();

    // Auto-confirm if joined less than 2 minutes ago
    if (waitTime < AUTO_CONFIRM_THRESHOLD_MS) {
      const { error: updateError } = await supabase
        .from('queue_entries')
        .update({
          status: 'confirmed',
          confirmed_ready: true,
          confirmed_at: now.toISOString(),
        })
        .eq('id', entry.id);

      if (updateError) {
        console.error('Error auto-confirming:', updateError);
        return NextResponse.json(
          { error: 'Failed to auto-confirm' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        autoConfirmed: true,
        status: 'confirmed',
      });
    }

    // Send ready check
    const { error: updateError } = await supabase
      .from('queue_entries')
      .update({
        status: 'ready_check',
        ready_check_sent_at: now.toISOString(),
      })
      .eq('id', entry.id);

    if (updateError) {
      console.error('Error sending ready check:', updateError);
      return NextResponse.json(
        { error: 'Failed to send ready check' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      autoConfirmed: false,
      status: 'ready_check',
      expiresAt: new Date(now.getTime() + READY_CHECK_TIMEOUT_MS),
    });
  } catch (error) {
    console.error('Error initiating ready check:', error);
    return NextResponse.json(
      { error: 'Failed to initiate ready check' },
      { status: 500 }
    );
  }
}
