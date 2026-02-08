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
    // Get total unique visitors (count distinct visitor hashes)
    const { count, error } = await supabase
      .from('visitors')
      .select('*', { count: 'exact', head: true });

    if (error) throw error;

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Error fetching visitor count:', error);
    return NextResponse.json({ count: 0 });
  }
}

export async function POST(request: NextRequest) {
  const supabase = getSupabaseClient();

  if (!supabase) {
    return NextResponse.json({ success: false, error: 'Database not configured' });
  }

  try {
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
