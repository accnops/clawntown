import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateCouncilResponse, isGeminiConfigured } from '@/lib/gemini';
import { getCouncilMember } from '@/data/council-members';
import { sanitizeMessage } from '@/lib/sanitize';
import { moderateWithLLM } from '@/lib/moderate';
import { withRateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 10 requests per minute per IP
    const rateLimited = await withRateLimit('chat', { limit: 10 });
    if (rateLimited) return rateLimited;

    // Check authentication
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (supabaseUrl && supabaseAnonKey) {
        const supabase = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: authHeader } }
        });
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        }
      }
    } else {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { memberId, citizenName, message, history } = await request.json();

    if (!memberId || !citizenName || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Sanitize message (Pass 1: regex + profanity)
    const sanitizeResult = sanitizeMessage(message);
    if (!sanitizeResult.ok) {
      return NextResponse.json({
        error: 'message_rejected',
        reason: sanitizeResult.reason,
        category: sanitizeResult.category,
      }, { status: 422 });
    }

    // Moderate message (Pass 2: LLM moderation)
    if (isGeminiConfigured()) {
      const moderation = await moderateWithLLM(sanitizeResult.sanitized);
      if (!moderation.safe) {
        return NextResponse.json({
          error: 'message_rejected',
          reason: "Whoa there, citizen! That message isn't appropriate for Clawntown.",
          category: moderation.category,
        }, { status: 422 });
      }
    }

    // Get council member
    const councilMember = getCouncilMember(memberId);
    if (!councilMember) {
      return NextResponse.json({ error: 'Council member not found' }, { status: 404 });
    }

    if (!isGeminiConfigured()) {
      console.error('GEMINI_API_KEY not found. Available env keys:', Object.keys(process.env).filter(k => k.includes('GEMINI') || k.includes('gemini')));
      return NextResponse.json({
        error: 'Gemini API not configured',
        response: `*${councilMember.name} is currently unavailable. Please try again later.*`
      }, { status: 503 });
    }

    // Generate response
    const response = await generateCouncilResponse(
      councilMember.personality,
      citizenName,
      sanitizeResult.sanitized,
      history || []
    );

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
