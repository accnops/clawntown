import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Simple privacy-respecting visitor counter
// No cookies, no personal data - just counts unique daily visitors by hashed IP

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function getSupabaseClient() {
  if (!supabaseUrl || !supabaseKey) {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
}

// Hash the IP for privacy (we don't store the actual IP)
async function hashIP(ip: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(ip + new Date().toISOString().split('T')[0]); // Include date for daily uniqueness
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
}

export async function GET() {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ count: 0, error: 'Database not configured' });
  }

  try {
    // Get unique visitors by fetching distinct visitor hashes
    // Note: Supabase JS doesn't support COUNT(DISTINCT), so we fetch and count
    const { data, error } = await supabase
      .from('visitors')
      .select('visitor_hash');

    if (error) throw error;

    // Count unique visitor hashes
    const uniqueVisitors = new Set(data?.map(row => row.visitor_hash) || []);

    return NextResponse.json({ count: uniqueVisitors.size });
  } catch (error) {
    console.error('Error fetching visitor count:', error);
    return NextResponse.json({ count: 0 });
  }
}

// Common bot user agent patterns
const BOT_PATTERNS = [
  /bot/i,
  /crawler/i,
  /spider/i,
  /crawling/i,
  /googlebot/i,
  /bingbot/i,
  /yandex/i,
  /baidu/i,
  /duckduckbot/i,
  /slurp/i,
  /facebookexternalhit/i,
  /linkedinbot/i,
  /twitterbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /discordbot/i,
  /slackbot/i,
  /applebot/i,
  /semrush/i,
  /ahrefsbot/i,
  /mj12bot/i,
  /dotbot/i,
  /petalbot/i,
  /bytespider/i,
  /gptbot/i,
  /claudebot/i,
  /anthropic/i,
  /headless/i,
  /phantom/i,
  /selenium/i,
  /puppeteer/i,
  /playwright/i,
  /wget/i,
  /curl/i,
  /httpie/i,
  /python-requests/i,
  /go-http-client/i,
  /java\//i,
  /libwww/i,
  /uptimerobot/i,
  /pingdom/i,
  /statuscake/i,
  /vercel/i,
];

function isBot(userAgent: string | null): boolean {
  if (!userAgent) return true; // No user agent = probably a bot
  return BOT_PATTERNS.some(pattern => pattern.test(userAgent));
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Database not configured' });
  }

  try {
    // Skip bots
    const userAgent = request.headers.get('user-agent');
    if (isBot(userAgent)) {
      return NextResponse.json({ success: true, skipped: 'bot' });
    }

    // Get IP from headers (works on Vercel)
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
               request.headers.get('x-real-ip') ||
               'unknown';

    const visitorHash = await hashIP(ip);
    const today = new Date().toISOString().split('T')[0];

    // Upsert visitor (only count once per day per IP hash)
    const { error } = await supabase
      .from('visitors')
      .upsert(
        { visitor_hash: visitorHash, visit_date: today },
        { onConflict: 'visitor_hash,visit_date' }
      );

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error logging visitor:', error);
    return NextResponse.json({ success: false });
  }
}
