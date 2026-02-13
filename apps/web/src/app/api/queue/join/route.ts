import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { isEmailBanned } from '@/lib/violations';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { memberId, citizenId } = await request.json();

    if (!memberId || !citizenId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get user data
    const { data: userData } = await supabase.auth.admin.getUserById(citizenId);
    const email = userData?.user?.email;

    // Check if email is banned (tracks by email to prevent account recreation evasion)
    if (email) {
      const banStatus = await isEmailBanned(email);
      if (banStatus.isBanned) {
        return NextResponse.json(
          {
            error: 'You are temporarily banned due to conduct violations',
            bannedUntil: banStatus.bannedUntil?.toISOString(),
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

    // Ensure citizen exists in citizens table (upsert from auth user)
    const citizenName = userData?.user?.user_metadata?.citizen_name || 'Anonymous Crab';
    const citizenAvatar = userData?.user?.user_metadata?.citizen_avatar || 'citizen_01';

    const { error: upsertError } = await supabase
      .from('citizens')
      .upsert({
        id: citizenId,
        name: citizenName,
        avatar: citizenAvatar,
      }, { onConflict: 'id' });

    if (upsertError) {
      console.error('Error upserting citizen:', upsertError);
      return NextResponse.json({ error: 'Failed to create citizen record' }, { status: 500 });
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

    // Add to queue with initial heartbeat
    const { data: entry, error: insertError } = await supabase
      .from('queue_entries')
      .insert({
        member_id: memberId,
        citizen_id: citizenId,
        status: 'waiting',
        last_heartbeat_at: new Date().toISOString(),
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

    // Auto-start turn if this person is first in line and no active turn
    let turn = null;
    if ((position ?? 0) === 0) {
      // Check if there's already an active turn
      const { data: existingTurn } = await supabase
        .from('turns')
        .select('*')
        .eq('member_id', memberId)
        .is('ended_at', null)
        .maybeSingle();

      if (!existingTurn) {
        // Start their turn automatically
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
          || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3002');

        console.log('[Queue Join] Auto-starting turn, baseUrl:', baseUrl);

        const startRes = await fetch(new URL('/api/turn/start', baseUrl), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ memberId }),
        });

        console.log('[Queue Join] Turn start response:', startRes.status);

        if (startRes.ok) {
          const startData = await startRes.json();
          turn = startData.turn;
        } else {
          const errorData = await startRes.json().catch(() => ({}));
          console.log('[Queue Join] Turn start failed:', errorData);
        }
      }
    }

    // Convert 0-indexed DB position to 1-indexed for UI
    return NextResponse.json({
      entry,
      position: (position ?? 0) + 1,
      queueLength: queueLength ?? 1,
      turn,
    });
  } catch (error) {
    console.error('Error joining queue:', error);
    return NextResponse.json({ error: 'Failed to join queue' }, { status: 500 });
  }
}
