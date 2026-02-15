import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { verifyCaptcha, getVisitorIP } from '@/lib/captcha';
import { withRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 requests per minute per IP
    const rateLimited = await withRateLimit('auth/signin', { limit: 10 });
    if (rateLimited) return rateLimited;

    const { email, captchaToken } = await request.json();

    if (!email || !captchaToken) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify captcha
    const ip = getVisitorIP(request.headers);
    const captchaResult = await verifyCaptcha(captchaToken, ip);

    if (!captchaResult.success) {
      return NextResponse.json({ error: captchaResult.error || 'Captcha verification failed' }, { status: 400 });
    }

    const origin = request.headers.get('origin') || new URL(request.url).origin;
    const supabase = getSupabaseAdmin();

    // Check if user exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (!existingUser) {
      return NextResponse.json({ error: 'No account found. Please register first.' }, { status: 404 });
    }

    // User exists - send magic link
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback`,
      },
    });

    if (otpError) {
      console.error('Error sending magic link:', otpError);
      return NextResponse.json({ error: 'Failed to send magic link' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Magic link sent' });
  } catch (error) {
    console.error('Signin error:', error);
    return NextResponse.json({ error: 'Signin failed' }, { status: 500 });
  }
}
