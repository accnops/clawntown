import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { generateCouncilResponse, isGeminiConfigured } from '@/lib/gemini';
import { getCouncilMember } from '@/data/council-members';
import { sanitizeMessage } from '@/lib/sanitize';
import { moderateWithLLM } from '@/lib/moderate';
import { recordViolation } from '@/lib/violations';
import { checkMessageThrottle, recordMessageSent } from '@/lib/throttle';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { memberId, citizenId, content } = await request.json();

    if (!memberId || !citizenId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Parallel: throttle + sanitize + get turn
    const [throttle, sanitizeResult, turnResult] = await Promise.all([
      checkMessageThrottle(citizenId),
      Promise.resolve(sanitizeMessage(content)),
      supabase
        .from('turns')
        .select('*')
        .eq('member_id', memberId)
        .is('ended_at', null)
        .single(),
    ]);

    if (!throttle.allowed) {
      return NextResponse.json(
        { error: `Please wait ${throttle.waitSeconds} seconds` },
        { status: 429 }
      );
    }

    if (!sanitizeResult.ok) {
      return NextResponse.json({
        error: 'message_rejected',
        reason: sanitizeResult.reason,
        category: sanitizeResult.category,
      }, { status: 422 });
    }
    const sanitizedContent = sanitizeResult.sanitized;

    const { data: turn, error: turnError } = turnResult;
    if (turnError || !turn) {
      return NextResponse.json({ error: 'No active turn' }, { status: 400 });
    }

    // Verify turn belongs to this citizen
    if (turn.citizen_id !== citizenId) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
    }

    // Moderate message (Pass 2: LLM moderation)
    if (isGeminiConfigured()) {
      const moderation = await moderateWithLLM(sanitizedContent);
      if (!moderation.safe) {
        // Record the violation
        // Map moderation category to violation type
        const validViolationTypes = ['profanity', 'injection', 'harassment', 'hate_speech', 'dangerous', 'spam'] as const;
        type ViolationType = typeof validViolationTypes[number];
        const violationType: ViolationType = validViolationTypes.includes(moderation.category as ViolationType)
          ? (moderation.category as ViolationType)
          : 'spam';

        const violationResult = await recordViolation(
          citizenId,
          violationType,
          content,
          turn.id
        );

        // End the turn due to violation
        await supabase
          .from('turns')
          .update({ ended_at: new Date().toISOString() })
          .eq('id', turn.id);

        // Update queue entry to reflect violation
        await supabase
          .from('queue_entries')
          .update({ status: 'completed' })
          .eq('citizen_id', citizenId)
          .eq('member_id', memberId)
          .eq('status', 'active');

        return NextResponse.json(
          {
            error: 'message_rejected',
            category: moderation.category,
            reason: "Whoa there, citizen! That message isn't appropriate for Clawntown.",
            turnEnded: true,
            isBanned: violationResult.isBanned,
            bannedUntil: violationResult.bannedUntil?.toISOString(),
          },
          { status: 422 }
        );
      }
    }

    // Check if turn has expired
    const now = new Date();
    const expiresAt = new Date(turn.expires_at);
    if (now > expiresAt) {
      return NextResponse.json({
        error: 'Turn has expired',
        shouldEnd: true,
        reason: 'timeout',
      }, { status: 400 });
    }

    // Check message limit
    if (turn.messages_used >= turn.message_limit) {
      return NextResponse.json({
        error: 'Message limit reached',
        shouldEnd: true,
        reason: 'completed',
      }, { status: 400 });
    }

    // Check character limit (use sanitized content length)
    const newCharsUsed = turn.chars_used + sanitizedContent.length;
    if (newCharsUsed > turn.char_budget) {
      return NextResponse.json({
        error: 'Character budget exceeded',
        remainingChars: turn.char_budget - turn.chars_used,
      }, { status: 400 });
    }

    // Get council member personality
    const councilMember = getCouncilMember(memberId);
    if (!councilMember) {
      return NextResponse.json({ error: 'Council member not found' }, { status: 404 });
    }

    // Parallel: get citizen info + fetch history
    const [citizenResult, historyResult] = await Promise.all([
      supabase
        .from('citizens')
        .select('name, avatar')
        .eq('id', citizenId)
        .single(),
      isGeminiConfigured()
        ? supabase
            .from('conversation_messages')
            .select('role, content, citizen_name')
            .eq('session_id', turn.session_id)
            .order('created_at', { ascending: false })
            .limit(20)
        : Promise.resolve({ data: null }),
    ]);

    const citizen = citizenResult.data;
    const historyData = historyResult.data;

    const citizenName = citizen?.name || 'Citizen';
    const citizenAvatar = citizen?.avatar || null;

    // Prepare conversation history for LLM
    let conversationHistory: Array<{ role: 'citizen' | 'council'; content: string; citizenName: string | null }> = [];
    if (isGeminiConfigured() && historyData) {
      const MAX_CHARS = 8_000;
      let totalChars = 0;
      const cappedHistory = historyData.filter(msg => {
        if (totalChars >= MAX_CHARS) return false;
        totalChars += msg.content.length;
        return true;
      }).reverse();
      conversationHistory = cappedHistory.map(msg => ({
        role: msg.role as 'citizen' | 'council',
        content: msg.content,
        citizenName: msg.citizen_name as string | null,
      }));
    }

    // Parallel: save citizen message + generate council response
    const [citizenMsgResult, responseText] = await Promise.all([
      supabase
        .from('conversation_messages')
        .insert({
          session_id: turn.session_id,
          role: 'citizen',
          citizen_id: citizenId,
          citizen_name: citizenName,
          citizen_avatar: citizenAvatar,
          content: sanitizedContent,
        })
        .select()
        .single(),
      isGeminiConfigured()
        ? generateCouncilResponse(councilMember.personality, citizenName, sanitizedContent, conversationHistory)
        : Promise.resolve(null),
    ]);

    if (citizenMsgResult.error) {
      console.error('Error saving citizen message:', citizenMsgResult.error);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }
    const citizenMessage = citizenMsgResult.data;

    // Update turn state
    const newMessagesUsed = turn.messages_used + 1;
    const shouldEnd = newMessagesUsed >= turn.message_limit;
    const councilMsgContent = responseText;

    // Save council message (parallel with end_turn if ending, or update_turn if not)
    let councilMessage = null;
    let queueLength = 0;
    let nextTurn = null;

    if (shouldEnd) {
      // End turn + save council message in parallel
      const [endTurnResult, savedCouncilResult] = await Promise.all([
        (supabase.rpc as CallableFunction)('end_turn_batch', {
          p_turn_id: turn.id,
          p_citizen_id: citizenId,
          p_member_id: memberId,
          p_messages_used: newMessagesUsed,
          p_chars_used: newCharsUsed,
        }),
        councilMsgContent
          ? supabase
              .from('conversation_messages')
              .insert({
                session_id: turn.session_id,
                role: 'council',
                citizen_id: null,
                citizen_name: null,
                content: councilMsgContent,
              })
              .select()
              .single()
          : Promise.resolve({ data: null }),
      ]);

      queueLength = endTurnResult.data ?? 0;
      if (savedCouncilResult.data) {
        councilMessage = savedCouncilResult.data;
      }

      // Auto-start next turn
      const { data: nextInQueue } = await supabase
        .from('queue_entries')
        .select('*')
        .eq('member_id', memberId)
        .eq('status', 'waiting')
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (nextInQueue) {
        const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
          || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3002');
        try {
          const startRes = await fetch(new URL('/api/turn/start', baseUrl), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ memberId }),
          });
          if (startRes.ok) {
            const startData = await startRes.json();
            nextTurn = startData.turn;
          }
        } catch (e) {
          console.error('Error auto-starting next turn:', e);
        }
      }
    } else {
      // Update turn + save council message in parallel
      const [, savedCouncilResult] = await Promise.all([
        supabase
          .from('turns')
          .update({
            chars_used: newCharsUsed,
            messages_used: newMessagesUsed,
          })
          .eq('id', turn.id),
        councilMsgContent
          ? supabase
              .from('conversation_messages')
              .insert({
                session_id: turn.session_id,
                role: 'council',
                citizen_id: null,
                citizen_name: null,
                content: councilMsgContent,
              })
              .select()
              .single()
          : Promise.resolve({ data: null }),
      ]);

      if (savedCouncilResult.data) {
        councilMessage = savedCouncilResult.data;
      }
    }

    // Broadcast messages
    const channel = supabase.channel(`council:${memberId}`);
    await channel.httpSend('message', { message: citizenMessage });
    if (councilMessage) {
      await channel.httpSend('message', { message: councilMessage });
    }

    if (shouldEnd) {
      // Broadcast turn ended
      await channel.httpSend('turn_ended', {
        endedTurn: { ...turn, ended_at: new Date().toISOString() },
        nextTurn,
        queueLength,
      });
    }

    // Defer only throttle recording to after response
    after(async () => {
      await recordMessageSent(citizenId);
    });

    return NextResponse.json({
      citizenMessage,
      councilMessage,
      turn: { ...turn, chars_used: newCharsUsed, messages_used: newMessagesUsed, ended_at: shouldEnd ? new Date().toISOString() : null },
      shouldEnd,
      leftQueue: shouldEnd,
      nextTurn,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
