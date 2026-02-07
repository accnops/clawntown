import { NextRequest, NextResponse } from 'next/server';
import { generateCouncilResponse, isGeminiConfigured } from '@/lib/gemini';
import { getCouncilMember } from '@/data/council-members';

export async function POST(request: NextRequest) {
  try {
    const { memberId, citizenName, message, history } = await request.json();

    if (!memberId || !citizenName || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
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
      message,
      history || []
    );

    return NextResponse.json({ response });
  } catch (error) {
    console.error('Error in chat API:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}
