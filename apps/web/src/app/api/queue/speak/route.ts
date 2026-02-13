import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCouncilMember, isCouncilMemberOnline } from '@/data/council-members';
import { generateCouncilResponse, isGeminiConfigured } from '@/lib/gemini';
import { sanitizeMessage } from '@/lib/sanitize';
import { moderateWithLLM } from '@/lib/moderate';
import { isEmailBanned } from '@/lib/violations';
import { checkMessageThrottle, recordMessageSent } from '@/lib/throttle';

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

    // Verify council member is online (sync, fast)
    const member = getCouncilMember(memberId);
    if (!member || !isCouncilMemberOnline(member)) {
      return NextResponse.json({ error: 'Council member is offline' }, { status: 400 });
    }

    // Parallel: get_user + sanitize (independent operations)
    const [userDataResult, sanitizeResult] = await Promise.all([
      supabase.auth.admin.getUserById(citizenId),
      Promise.resolve(sanitizeMessage(content)),
    ]);

    const userData = userDataResult.data;
    const email = userData?.user?.email;

    // Check sanitization result
    if (!sanitizeResult.ok) {
      return NextResponse.json({
        error: 'message_rejected',
        reason: sanitizeResult.reason,
        category: sanitizeResult.category,
      }, { status: 422 });
    }
    const sanitizedContent = sanitizeResult.sanitized;

    // Check if captcha is needed (1 hour since last verification)
    const lastCaptchaAt = userData?.user?.user_metadata?.last_captcha_at;
    if (lastCaptchaAt) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (new Date(lastCaptchaAt) < oneHourAgo) {
        return NextResponse.json(
          { error: 'Captcha verification required', requiresCaptcha: true },
          { status: 403 }
        );
      }
    } else {
      // No captcha ever done, require one
      return NextResponse.json(
        { error: 'Captcha verification required', requiresCaptcha: true },
        { status: 403 }
      );
    }

    // Parallel: ban check + throttle check + moderation
    const [banStatus, throttle, moderation] = await Promise.all([
      email ? isEmailBanned(email) : Promise.resolve({ isBanned: false, bannedUntil: null }),
      checkMessageThrottle(citizenId),
      isGeminiConfigured() ? moderateWithLLM(sanitizedContent) : Promise.resolve({ safe: true } as const),
    ]);

    if (banStatus.isBanned) {
      return NextResponse.json(
        {
          error: 'You are temporarily banned due to conduct violations',
          bannedUntil: banStatus.bannedUntil?.toISOString(),
        },
        { status: 403 }
      );
    }

    if (!throttle.allowed) {
      return NextResponse.json(
        { error: `Please wait ${throttle.waitSeconds} seconds` },
        { status: 429 }
      );
    }

    if (!moderation.safe) {
      return NextResponse.json({
        error: 'message_rejected',
        reason: "Whoa there, citizen! That message isn't appropriate for Clawntown.",
        category: 'category' in moderation ? moderation.category : 'unknown',
      }, { status: 422 });
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

    // If RPC failed or returned no result, fall back to explicitly joining the queue
    if (rpcError || !result) {
      console.error('Error in try_speak, falling back to queue join:', rpcError);

      // Fallback: just join the queue
      const { data: queueEntry, error: joinError } = await supabase
        .from('queue_entries')
        .upsert({
          member_id: memberId,
          citizen_id: citizenId,
          status: 'waiting',
          last_heartbeat_at: new Date().toISOString(),
        }, {
          onConflict: 'member_id,citizen_id',
          ignoreDuplicates: false,
        })
        .select()
        .single();

      if (joinError && !joinError.message.includes('duplicate')) {
        console.error('Fallback queue join failed:', joinError);
        return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
      }

      // Get queue position
      const { count } = await supabase
        .from('queue_entries')
        .select('*', { count: 'exact', head: true })
        .eq('member_id', memberId)
        .eq('status', 'waiting');

      return NextResponse.json({
        action: 'queued',
        position: (count ?? 1) - 1,
        queueLength: count ?? 1,
      });
    }

    const speakResult = (result as { action: string; turn_id: string | null; session_id: string | null; queue_position: number | null; queue_length: number }[])?.[0];

    if (!speakResult) {
      // No result but no error - treat as queued
      return NextResponse.json({
        action: 'queued',
        position: 0,
        queueLength: 1,
      });
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
      const sessionId = speakResult.session_id;
      const turnId = speakResult.turn_id;

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
              .eq('session_id', sessionId)
              .order('created_at', { ascending: false })
              .limit(20)
          : Promise.resolve({ data: null }),
      ]);

      const citizen = citizenResult.data;
      const historyData = historyResult.data;

      const finalCitizenName = citizen?.name || citizenName || 'Citizen';
      const finalCitizenAvatar = citizen?.avatar || citizenAvatar || null;

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

      // Generate council response (critical path - must wait for this)
      const councilResponseText = isGeminiConfigured()
        ? await generateCouncilResponse(member.personality, finalCitizenName, sanitizedContent, conversationHistory)
        : null;

      // Pre-generate UUIDs and timestamps for immediate broadcast + return
      const now = new Date().toISOString();
      const citizenMessageId = crypto.randomUUID();
      const councilMessageId = councilResponseText ? crypto.randomUUID() : null;

      // Build message objects with pre-generated IDs
      const citizenMessage = {
        id: citizenMessageId,
        session_id: sessionId,
        role: 'citizen' as const,
        citizen_id: citizenId,
        citizen_name: finalCitizenName,
        citizen_avatar: finalCitizenAvatar,
        content: sanitizedContent,
        created_at: now,
      };

      const councilMessage = councilResponseText ? {
        id: councilMessageId!,
        session_id: sessionId,
        role: 'council' as const,
        citizen_id: null,
        citizen_name: null,
        citizen_avatar: null,
        content: councilResponseText,
        created_at: now,
      } : null;

      // Broadcast messages immediately (before DB save)
      const channel = supabase.channel(`council:${memberId}`);
      await channel.httpSend('message', { message: citizenMessage });
      if (councilMessage) {
        await channel.httpSend('message', { message: councilMessage });
      }

      // Broadcast turn ended (queueLength will be updated by after())
      await channel.httpSend('turn_ended', {
        endedTurn: { id: turnId },
        nextTurn: null, // Will be handled by after()
        queueLength: 0, // Approximate - real value comes from end_turn_batch
      });

      // Defer ALL DB operations to after response
      after(async () => {
        const afterSupabase = getSupabaseAdmin();

        // Save both messages + end turn in parallel
        await Promise.all([
          afterSupabase
            .from('conversation_messages')
            .insert({
              id: citizenMessageId,
              session_id: sessionId,
              role: 'citizen',
              citizen_id: citizenId,
              citizen_name: finalCitizenName,
              citizen_avatar: finalCitizenAvatar,
              content: sanitizedContent,
            }),
          councilResponseText
            ? afterSupabase
                .from('conversation_messages')
                .insert({
                  id: councilMessageId!,
                  session_id: sessionId,
                  role: 'council',
                  citizen_id: null,
                  citizen_name: null,
                  content: councilResponseText,
                })
            : Promise.resolve(),
          (afterSupabase.rpc as CallableFunction)('end_turn_batch', {
            p_turn_id: turnId,
            p_citizen_id: citizenId,
            p_member_id: memberId,
            p_messages_used: 1,
            p_chars_used: sanitizedContent.length,
          }),
          recordMessageSent(citizenId),
        ]);

        // Auto-start next turn if someone is waiting
        const { data: nextInQueue } = await afterSupabase
          .from('queue_entries')
          .select('id')
          .eq('member_id', memberId)
          .eq('status', 'waiting')
          .order('joined_at', { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextInQueue) {
          const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
            || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3002');
          try {
            await fetch(new URL('/api/turn/start', baseUrl), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ memberId }),
            });
          } catch (e) {
            console.error('Error auto-starting next turn:', e);
          }
        }
      });

      return NextResponse.json({
        action: 'sent',
        citizenMessage,
        councilMessage,
        queueLength: 0, // Approximate - real value comes from broadcast
      });
    }

    return NextResponse.json({ error: 'Unexpected state' }, { status: 500 });
  } catch (error) {
    console.error('Error in speak endpoint:', error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
