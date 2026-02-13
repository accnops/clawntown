const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY;
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export interface CaptchaVerifyResult {
  success: boolean;
  error?: string;
  codes?: string[];
  dev?: boolean;
}

/**
 * Verify a Cloudflare Turnstile captcha token
 */
export async function verifyCaptcha(token: string, ip?: string): Promise<CaptchaVerifyResult> {
  if (!TURNSTILE_SECRET) {
    // Dev mode: skip verification
    console.log('[Captcha] Dev mode - skipping verification');
    return { success: true, dev: true };
  }

  if (!token) {
    console.log('[Captcha] No token provided');
    return { success: false, error: 'Missing captcha token' };
  }

  // Debug: log token preview and secret key prefix
  const tokenPreview = token.length > 20
    ? `${token.slice(0, 10)}...${token.slice(-10)} (len: ${token.length})`
    : `[short token: ${token}]`;
  const secretPreview = TURNSTILE_SECRET.slice(0, 8) + '...';
  console.log('[Captcha] Token:', tokenPreview);
  console.log('[Captcha] Secret prefix:', secretPreview);

  try {
    console.log('[Captcha] Visitor IP:', ip || 'unknown');

    const payload: Record<string, string> = {
      secret: TURNSTILE_SECRET,
      response: token,
    };

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

      return { success: false, error: errorMessage, codes: errorCodes };
    }

    return { success: true };
  } catch (err) {
    console.error('[Captcha] Network error:', err);
    return { success: false, error: 'Failed to verify captcha. Please try again.' };
  }
}

/**
 * Extract visitor IP from request headers
 */
export function getVisitorIP(headers: Headers): string {
  return headers.get('cf-connecting-ip')
    || headers.get('x-forwarded-for')?.split(',')[0]
    || headers.get('x-real-ip')
    || '';
}
