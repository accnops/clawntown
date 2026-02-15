import { getSupabaseAdmin } from './supabase-server';
import { headers } from 'next/headers';
import { createHash } from 'crypto';
import { NextResponse } from 'next/server';

export type RateLimitConfig = {
  limit?: number;
  windowMinutes?: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
};

function hashIP(ip: string): string {
  return createHash('sha256').update(ip).digest('hex').slice(0, 16);
}

function getClientIP(headersList: Headers): string {
  return (
    headersList.get('cf-connecting-ip') ||
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  );
}

export async function checkRateLimit(
  endpoint: string,
  config: RateLimitConfig = {}
): Promise<RateLimitResult> {
  const { limit = 10, windowMinutes = 1 } = config;

  const headersList = await headers();
  const ip = getClientIP(headersList);
  const ipHash = hashIP(ip);

  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .rpc('check_rate_limit', {
      p_ip_hash: ipHash,
      p_endpoint: endpoint,
      p_limit: limit,
      p_window_minutes: windowMinutes,
    })
    .single();

  if (error) {
    console.error('[rate-limit] RPC error:', error);
    // Fail open - allow request if rate limit check fails
    return { allowed: true, remaining: limit, resetAt: new Date() };
  }

  return {
    allowed: data.allowed,
    remaining: data.remaining,
    resetAt: new Date(data.reset_at),
  };
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  const retryAfter = Math.ceil((result.resetAt.getTime() - Date.now()) / 1000);

  return NextResponse.json(
    { error: 'Too many requests. Please try again later.' },
    {
      status: 429,
      headers: {
        'X-RateLimit-Remaining': String(result.remaining),
        'X-RateLimit-Reset': result.resetAt.toISOString(),
        'Retry-After': String(Math.max(1, retryAfter)),
      },
    }
  );
}

// Convenience wrapper for route handlers
export async function withRateLimit(
  endpoint: string,
  config: RateLimitConfig = {}
): Promise<NextResponse | null> {
  const result = await checkRateLimit(endpoint, config);
  if (!result.allowed) {
    return rateLimitResponse(result);
  }
  return null;
}
