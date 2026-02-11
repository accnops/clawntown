import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { generateCouncilResponse, isGeminiConfigured } from '@/lib/gemini';
import { getCouncilMember } from '@/data/council-members';
import { sanitizeMessage } from '@/lib/sanitize';
import { moderateWithLLM } from '@/lib/moderate';
import { recordViolation } from '@/lib/violations';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { memberId, citizenId, content } = await request.json();

    if (!memberId || !citizenId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Sanitize message (Pass 1: regex + profanity)
    const sanitizeResult = sanitizeMessage(content);
    if (!sanitizeResult.ok) {
      return NextResponse.json({
        error: 'message_rejected',
        reason: sanitizeResult.reason,
        category: sanitizeResult.category,
      }, { status: 422 });
    }

    const sanitizedContent = sanitizeResult.sanitized;

    // Get current turn (needed for violation recording before moderation)
    const { data: turn, error: turnError } = await supabase
      .from('turns')
      .select('*')
      .eq('member_id', memberId)
      .is('ended_at', null)
      .single();

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

    // Get citizen info for the message
    const { data: citizen } = await supabase
      .from('citizens')
      .select('name, avatar')
      .eq('id', citizenId)
      .single();

    const citizenName = citizen?.name || 'Citizen';
    const citizenAvatar = citizen?.avatar || null;

    // Get council member personality
    const councilMember = getCouncilMember(memberId);
    if (!councilMember) {
      return NextResponse.json({ error: 'Council member not found' }, { status: 404 });
    }

    // Save citizen message (sanitized)
    const { data: citizenMessage, error: msgError } = await supabase
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
      .single();

    if (msgError) {
      console.error('Error saving citizen message:', msgError);
      return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
    }

    // Generate council response if Gemini is configured
    let councilMessage = null;

    if (isGeminiConfigured()) {
      try {
        // Fetch recent conversation history (last 100 messages, capped at 100k chars)
        const { data: historyData } = await supabase
          .from('conversation_messages')
          .select('role, content')
          .eq('session_id', turn.session_id)
          .order('created_at', { ascending: false })
          .limit(100);

        // Cap at 100k chars (taking most recent messages first)
        const MAX_CHARS = 100_000;
        let totalChars = 0;
        const cappedHistory = (historyData || []).filter(msg => {
          if (totalChars >= MAX_CHARS) return false;
          totalChars += msg.content.length;
          return true;
        }).reverse(); // Reverse back to chronological order

        const conversationHistory = cappedHistory.map(msg => ({
          role: msg.role as 'citizen' | 'council',
          content: msg.content,
        }));

        // Generate response
        const responseText = await generateCouncilResponse(
          councilMember.personality,
          citizenName,
          sanitizedContent,
          conversationHistory.slice(0, -1) // Exclude current message
        );

        // Save council message
        const { data: savedCouncilMessage } = await supabase
          .from('conversation_messages')
          .insert({
            session_id: turn.session_id,
            role: 'council',
            citizen_id: null,
            citizen_name: null,
            content: responseText,
          })
          .select()
          .single();

        councilMessage = savedCouncilMessage;
      } catch (error) {
        console.error('Error generating council response:', error);
        // Continue without council response - citizen message was already saved
      }
    }

    // Update turn
    const newMessagesUsed = turn.messages_used + 1;
    const shouldEnd = newMessagesUsed >= turn.message_limit;

    // Broadcast messages to all spectators via httpSend (REST-based, no subscription needed)
    const channel = supabase.channel(`council:${memberId}`);
    await channel.httpSend('message', { message: citizenMessage });

    if (councilMessage) {
      await channel.httpSend('message', { message: councilMessage });
    }

    // If message limit reached, end the turn and leave queue
    if (shouldEnd) {
      // End the turn
      await supabase
        .from('turns')
        .update({
          chars_used: newCharsUsed,
          messages_used: newMessagesUsed,
          ended_at: new Date().toISOString(),
        })
        .eq('id', turn.id);

      // Mark queue entry as completed
      await supabase
        .from('queue_entries')
        .update({ status: 'completed' })
        .eq('citizen_id', citizenId)
        .eq('member_id', memberId)
        .eq('status', 'active');

      // Get updated queue length
      const { data: queueLength } = await supabase
        .rpc('get_queue_length', { p_member_id: memberId });

      // Broadcast turn ended
      await channel.httpSend('turn_ended', {
        endedTurn: { ...turn, ended_at: new Date().toISOString() },
        nextTurn: null, // Next turn will be started by heartbeat
        queueLength: queueLength ?? 0,
      });

      return NextResponse.json({
        citizenMessage,
        councilMessage,
        turn: { ...turn, chars_used: newCharsUsed, messages_used: newMessagesUsed, ended_at: new Date().toISOString() },
        shouldEnd: true,
        leftQueue: true,
      });
    }

    // Just update the turn (not ending)
    const { data: updatedTurn } = await supabase
      .from('turns')
      .update({
        chars_used: newCharsUsed,
        messages_used: newMessagesUsed,
      })
      .eq('id', turn.id)
      .select()
      .single();

    return NextResponse.json({
      citizenMessage,
      councilMessage,
      turn: updatedTurn,
      shouldEnd: false,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
