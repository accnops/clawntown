import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { verifyCaptcha, getVisitorIP } from '@/lib/captcha';
import { withRateLimit } from '@/lib/rate-limit';
import { validateUsername } from '@/lib/sanitize';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 requests per minute per IP
    const rateLimited = await withRateLimit('auth/signup', { limit: 5 });
    if (rateLimited) return rateLimited;

    const { email, name, avatarId, captchaToken } = await request.json();

    if (!email || !captchaToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify captcha
    const ip = getVisitorIP(request.headers);
    const captchaResult = await verifyCaptcha(captchaToken, ip);

    if (!captchaResult.success) {
      return NextResponse.json({ error: captchaResult.error || 'Captcha verification failed' }, { status: 400 });
    }

    // Validate username if provided
    if (name) {
      const usernameResult = await validateUsername(name);
      if (!usernameResult.ok) {
        return NextResponse.json({ error: usernameResult.reason }, { status: 400 });
      }
    }

    const origin = request.headers.get('origin') || new URL(request.url).origin;
    const supabase = getSupabaseAdmin();

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists, sign in instead' }, { status: 409 });
    }

    // Create new unverified user with profile metadata
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: false,
      user_metadata: {
        citizen_name: name || 'Anonymous Crab',
        citizen_avatar: avatarId || 'citizen_01',
        last_captcha_at: new Date().toISOString(),
        violation_count: 0,
        banned_until: null,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    // Send magic link for verification
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (otpError) {
      console.error('Error sending magic link:', otpError);
      return NextResponse.json({ error: 'Account created but failed to send magic link' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Account created and magic link sent' });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Signup failed' }, { status: 500 });
  }
}
