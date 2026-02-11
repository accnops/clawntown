import { NextRequest, NextResponse } from 'next/server';

// Prevent any caching of this route
export const dynamic = 'force-dynamic';

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function POST(request: NextRequest) {
  if (!TURNSTILE_SECRET) {
    // Dev mode: skip verification
    console.log('[Captcha] Dev mode - skipping verification');
    return NextResponse.json({ success: true, dev: true });
  }

  const { token } = await request.json();

  if (!token) {
    console.log('[Captcha] No token provided');
    return NextResponse.json(
      { success: false, error: 'Missing captcha token' },
      { status: 400 }
    );
  }

  // Debug: log token preview and secret key prefix
  const tokenPreview = token.length > 20
    ? `${token.slice(0, 10)}...${token.slice(-10)} (len: ${token.length})`
    : `[short token: ${token}]`;
  const secretPreview = TURNSTILE_SECRET.slice(0, 8) + '...';
  console.log('[Captcha] Token:', tokenPreview);
  console.log('[Captcha] Secret prefix:', secretPreview);

  try {
    // Get visitor IP for additional validation
    const ip = request.headers.get('cf-connecting-ip')
      || request.headers.get('x-forwarded-for')?.split(',')[0]
      || request.headers.get('x-real-ip')
      || '';

    console.log('[Captcha] Visitor IP:', ip || 'unknown');

    // Try JSON format (Cloudflare accepts both JSON and form-urlencoded)
    const payload: Record<string, string> = {
      secret: TURNSTILE_SECRET,
      response: token,
    };

    // Include IP if available (helps Cloudflare validate)
    if (ip) {
      payload.remoteip = ip;
    }

    console.log('[Captcha] Sending to Cloudflare with JSON format');

    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json();

    console.log('[Captcha] Cloudflare response:', JSON.stringify(result));

    if (!result.success) {
      // Cloudflare error codes: https://developers.cloudflare.com/turnstile/reference/error-codes/
      const errorCodes = result['error-codes'] || [];
      console.log('[Captcha] Verification failed. Error codes:', errorCodes);

      let errorMessage = 'Captcha verification failed';
      if (errorCodes.includes('timeout-or-duplicate')) {
        errorMessage = 'Captcha expired or already used. Please try again.';
      } else if (errorCodes.includes('invalid-input-response')) {
        errorMessage = 'Invalid captcha. Please refresh and try again.';
      } else if (errorCodes.includes('invalid-input-secret')) {
        errorMessage = 'Server configuration error. Please contact support.';
      }

      return NextResponse.json(
        { success: false, error: errorMessage, codes: errorCodes },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[Captcha] Network error:', err);
    return NextResponse.json(
      { success: false, error: 'Failed to verify captcha. Please try again.' },
      { status: 500 }
    );
  }
}
