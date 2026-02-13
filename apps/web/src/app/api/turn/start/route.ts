import { NextRequest, NextResponse } from 'next/server';
import { startNextTurn } from '@/lib/turn';

export async function POST(request: NextRequest) {
  try {
    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    const result = await startNextTurn(memberId);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      turn: result.turn,
      session: result.session,
      queueLength: result.queueLength,
    });
  } catch (error) {
    console.error('Error starting turn:', error);
    return NextResponse.json({ error: 'Failed to start turn' }, { status: 500 });
  }
}
