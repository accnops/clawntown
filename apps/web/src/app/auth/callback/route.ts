import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const name = requestUrl.searchParams.get('name');
  const avatar = requestUrl.searchParams.get('avatar');

  if (code) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Check if this is a new registration (name and avatar provided)
      if (name && avatar) {
        await supabase.auth.updateUser({
          data: {
            citizen_name: name,
            citizen_avatar: avatar,
            last_captcha_at: new Date().toISOString(),
            violation_count: 0,
            banned_until: null,
          },
        });
      }
    }
  }

  // Redirect to town hall after auth
  return NextResponse.redirect(new URL('/town-hall', requestUrl.origin));
}
