import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Get user data
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId);

    if (userError || !userData?.user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userData.user;
    const citizenName = user.user_metadata?.citizen_name || 'Anonymous Crab';
    const citizenAvatar = user.user_metadata?.citizen_avatar || 'citizen_01';

    // Upsert citizen record
    const { error: upsertError } = await supabase
      .from('citizens')
      .upsert({
        id: userId,
        name: citizenName,
        avatar: citizenAvatar,
      }, { onConflict: 'id' });

    if (upsertError) {
      console.error('Error upserting citizen:', upsertError);
      return NextResponse.json({ error: 'Failed to create citizen record' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ensure citizen error:', error);
    return NextResponse.json({ error: 'Failed to ensure citizen' }, { status: 500 });
  }
}
