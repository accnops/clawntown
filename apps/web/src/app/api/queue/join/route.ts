import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { memberId, citizenId } = await request.json();

    if (!memberId || !citizenId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check if citizen is banned
    const { data: userData } = await supabase.auth.admin.getUserById(citizenId);
    if (userData?.user?.user_metadata?.banned_until) {
      const bannedUntil = new Date(userData.user.user_metadata.banned_until);
      if (bannedUntil > new Date()) {
        return NextResponse.json(
          {
            error: 'You are temporarily banned',
            bannedUntil: bannedUntil.toISOString(),
          },
          { status: 403 }
        );
      }
    }

    // Check if captcha is needed (1 hour since last verification)
    const lastCaptchaAt = userData?.user?.user_metadata?.last_captcha_at;
    if (lastCaptchaAt) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (new Date(lastCaptchaAt) < oneHourAgo) {
        return NextResponse.json(
          { error: 'Captcha verification required', requiresCaptcha: true },
          { status: 403 }
        );
      }
    } else {
      // No captcha ever done, require one
      return NextResponse.json(
        { error: 'Captcha verification required', requiresCaptcha: true },
        { status: 403 }
      );
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
