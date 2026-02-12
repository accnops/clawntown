import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCouncilMember, isCouncilMemberOnline } from '@/data/council-members';
import { generateCouncilResponse, isGeminiConfigured } from '@/lib/gemini';
import { sanitizeMessage } from '@/lib/sanitize';
import { moderateWithLLM } from '@/lib/moderate';

const CHAR_BUDGET = 256;
const TIME_BUDGET_MS = 10000;
const MESSAGE_LIMIT = 1;

/**
 * Optimistic "Speak" endpoint - atomically tries to:
 * 1. Join queue (if not already in)
 * 2. Start turn (if queue was empty)
 * 3. Send message
 *
 * If race condition (someone else got in first), returns queued status
 * and the message is NOT sent (client keeps it in input).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { memberId, citizenId, citizenName, citizenAvatar, content } = await request.json();

    if (!memberId || !citizenId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify council member is online
    const member = getCouncilMember(memberId);
    if (!member || !isCouncilMemberOnline(member)) {
      return NextResponse.json({ error: 'Council member is offline' }, { status: 400 });
    }

    // Sanitize message first
    const sanitizeResult = sanitizeMessage(content);
    if (!sanitizeResult.ok) {
      return NextResponse.json({
        error: 'message_rejected',
        reason: sanitizeResult.reason,
        category: sanitizeResult.category,
      }, { status: 422 });
    }
    const sanitizedContent = sanitizeResult.sanitized;

    // LLM moderation
    if (isGeminiConfigured()) {
      const moderation = await moderateWithLLM(sanitizedContent);
      if (!moderation.safe) {
        return NextResponse.json({
          error: 'message_rejected',
          reason: "Whoa there, citizen! That message isn't appropriate for Clawntown.",
          category: moderation.category,
        }, { status: 422 });
      }
    }

    // Use advisory lock for atomic queue check + join + turn start
    const { data: result, error: rpcError } = await (supabase.rpc as CallableFunction)('try_speak', {
      p_member_id: memberId,
      p_citizen_id: citizenId,
      p_citizen_name: citizenName || 'Citizen',
      p_citizen_avatar: citizenAvatar || null,
      p_char_budget: CHAR_BUDGET,
      p_message_limit: MESSAGE_LIMIT,
      p_time_budget_seconds: TIME_BUDGET_MS / 1000,
    });

    if (rpcError) {
      console.error('Error in try_speak:', rpcError);
      return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
    }

    const speakResult = (result as { action: string; turn_id: string | null; session_id: string | null; queue_position: number | null; queue_length: number }[])?.[0];

    if (!speakResult) {
      return NextResponse.json({ error: 'No result from try_speak' }, { status: 500 });
    }

    // If we got queued (race lost), return early - client keeps message in input
    if (speakResult.action === 'queued') {
      return NextResponse.json({
        action: 'queued',
        position: speakResult.queue_position,
        queueLength: speakResult.queue_length,
      });
    }

    // We got the turn! Now send the message
    if (speakResult.action === 'turn_started' && speakResult.turn_id && speakResult.session_id) {
      // Get citizen info
      const { data: citizen } = await supabase
        .from('citizens')
        .select('name, avatar')
        .eq('id', citizenId)
        .single();

      const finalCitizenName = citizen?.name || citizenName || 'Citizen';
      const finalCitizenAvatar = citizen?.avatar || citizenAvatar || null;

      // Save citizen message
      const { data: citizenMessage, error: msgError } = await supabase
        .from('conversation_messages')
        .insert({
          session_id: speakResult.session_id,
          role: 'citizen',
          citizen_id: citizenId,
          citizen_name: finalCitizenName,
          citizen_avatar: finalCitizenAvatar,
          content: sanitizedContent,
        })
        .select()
        .single();

      if (msgError) {
        console.error('Error saving citizen message:', msgError);
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
      }

      // Generate council response
      let councilMessage = null;
      if (isGeminiConfigured()) {
        try {
          // Fetch recent conversation history
          const { data: historyData } = await supabase
            .from('conversation_messages')
            .select('role, content, citizen_name')
            .eq('session_id', speakResult.session_id)
            .order('created_at', { ascending: false })
            .limit(100);

          const conversationHistory = (historyData || []).reverse().map(msg => ({
            role: msg.role as 'citizen' | 'council',
            content: msg.content,
            citizenName: msg.citizen_name as string | null,
          }));

          const responseText = await generateCouncilResponse(
            member.personality,
            finalCitizenName,
            sanitizedContent,
            conversationHistory.slice(0, -1)
          );

          const { data: savedCouncilMessage } = await supabase
            .from('conversation_messages')
            .insert({
              session_id: speakResult.session_id,
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
        }
      }

      // End the turn (1 message limit reached)
      await supabase
        .from('turns')
        .update({
          messages_used: 1,
          chars_used: sanitizedContent.length,
          ended_at: new Date().toISOString()
        })
        .eq('id', speakResult.turn_id);

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

      // Auto-start next turn if someone is waiting
      let nextTurn = null;
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

      // Broadcast messages
      const channel = supabase.channel(`council:${memberId}`);
      await channel.httpSend('message', { message: citizenMessage });
      if (councilMessage) {
        await channel.httpSend('message', { message: councilMessage });
      }

      // Broadcast turn ended
      await channel.httpSend('turn_ended', {
        endedTurn: { id: speakResult.turn_id },
        nextTurn,
        queueLength: queueLength ?? 0,
      });

      return NextResponse.json({
        action: 'sent',
        citizenMessage,
        councilMessage,
        queueLength: queueLength ?? 0,
        nextTurn,
      });
    }

    return NextResponse.json({ error: 'Unexpected state' }, { status: 500 });
  } catch (error) {
    console.error('Error in speak endpoint:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
