import { NextRequest, NextResponse } from 'next/server';

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function POST(request: NextRequest) {
  if (!TURNSTILE_SECRET) {
    // Dev mode: skip verification
    return NextResponse.json({ success: true, dev: true });
  }

  const { token } = await request.json();

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Missing captcha token' },
      { status: 400 }
    );
  }

  const response = await fetch(TURNSTILE_VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: TURNSTILE_SECRET,
      response: token,
    }),
  });

  const result = await response.json();

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: 'Captcha verification failed' },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
