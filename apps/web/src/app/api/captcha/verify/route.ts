import { NextRequest, NextResponse } from 'next/server';
import { verifyCaptcha, getVisitorIP } from '@/lib/captcha';

// Prevent any caching of this route
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
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
}
