import { NextRequest, NextResponse } from 'next/server';
import { verifyCaptcha, getVisitorIP } from '@/lib/captcha';
import { withRateLimit } from '@/lib/rate-limit';

// Prevent any caching of this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 requests per minute per IP
    const rateLimited = await withRateLimit('captcha/verify', { limit: 10 });
    if (rateLimited) return rateLimited;

    const { token } = await request.json();
    const ip = getVisitorIP(request.headers);

    const result = await verifyCaptcha(token, ip);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error, codes: result.codes },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, dev: result.dev });
  } catch (error) {
    console.error('Error verifying captcha:', error);
    return NextResponse.json({ success: false, error: 'Failed to verify captcha' }, { status: 500 });
  }
}
