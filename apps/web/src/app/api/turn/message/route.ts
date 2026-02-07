import { NextRequest, NextResponse } from 'next/server';
import { kv, KV_KEYS } from '@/lib/kv';
import { createClient } from '@supabase/supabase-js';
import type { CitizenTurn, ConversationMessage } from '@clawntown/shared';

function getSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseClient();
    const { memberId, citizenId, content } = await request.json();

    if (!memberId || !citizenId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const turnKey = KV_KEYS.turn(memberId);

    // Get current turn
    const turn = await kv.get<CitizenTurn>(turnKey);
    if (!turn) {
      return NextResponse.json({ error: 'No active turn' }, { status: 400 });
    }

    // Verify turn is active and belongs to this citizen
    if (turn.status !== 'active') {
      return NextResponse.json({ error: 'Turn is not active' }, { status: 400 });
    }

    if (turn.citizenId !== citizenId) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
    }

    // Calculate time elapsed since turn started
    const now = Date.now();
    const elapsedMs = now - turn.startedAt;
    const totalTimeUsedMs = turn.timeUsedMs + elapsedMs;

    // Check time limit
    if (totalTimeUsedMs >= turn.timeBudgetMs) {
      return NextResponse.json({
        error: 'Time budget exceeded',
        shouldEnd: true,
        reason: 'timeout'
      }, { status: 400 });
    }

    // Check message limit
    if (turn.messagesUsed >= turn.messageLimit) {
      return NextResponse.json({
        error: 'Message limit reached',
        shouldEnd: true,
        reason: 'completed'
      }, { status: 400 });
    }

    // Check character limit
    const newCharsUsed = turn.charsUsed + content.length;
    if (newCharsUsed > turn.charBudget) {
      return NextResponse.json({
        error: 'Character budget exceeded',
        remainingChars: turn.charBudget - turn.charsUsed
      }, { status: 400 });
    }

    // Update turn
    const updatedTurn: CitizenTurn = {
      ...turn,
      charsUsed: newCharsUsed,
      timeUsedMs: totalTimeUsedMs,
      messagesUsed: turn.messagesUsed + 1,
      startedAt: now, // Reset timer for next message
    };

    // Check if this was the last allowed message
    const shouldEnd = updatedTurn.messagesUsed >= updatedTurn.messageLimit;

    // Save updated turn to KV
    await kv.set(turnKey, updatedTurn);

    // Create message
    const message: ConversationMessage = {
      id: crypto.randomUUID(),
      sessionId: turn.sessionId,
      role: 'citizen',
      citizenId: turn.citizenId,
      citizenName: turn.citizenName,
      content,
      createdAt: new Date(),
    };

    // Save message to Supabase
    await supabase.from('town_data').insert({
      id: message.id,
      type: 'conversation_message',
      data: message,
      created_at: message.createdAt.toISOString(),
    });

    // Broadcast message via Supabase channel
    await supabase.channel(`council:${memberId}:conversation`).send({
      type: 'broadcast',
      event: 'message',
      payload: { message, memberId },
    });

    return NextResponse.json({
      message,
      turn: updatedTurn,
      shouldEnd
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
