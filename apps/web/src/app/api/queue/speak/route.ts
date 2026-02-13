import { NextRequest, NextResponse } from 'next/server';
import { after } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { getCouncilMember, isCouncilMemberOnline } from '@/data/council-members';
import { generateCouncilResponse, isGeminiConfigured } from '@/lib/gemini';
import { sanitizeMessage } from '@/lib/sanitize';
import { moderateWithLLM } from '@/lib/moderate';
import { isEmailBanned } from '@/lib/violations';
import { checkMessageThrottle, recordMessageSent } from '@/lib/throttle';
import { startNextTurn } from '@/lib/turn';

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

    console.log(`[speak] citizenId=${citizenId} memberId=${memberId} attempting try_speak`);

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

    console.log(`[speak] citizenId=${citizenId} try_speak result:`, { result, rpcError: rpcError?.message });

    // If RPC failed or returned no result, fall back to explicitly joining the queue
    if (rpcError || !result) {
      console.log(`[speak] citizenId=${citizenId} try_speak failed, falling back to queue join. Error: ${rpcError?.message || 'no result'}`);

      // Try to insert - constraint will handle duplicates
      const { error: insertError } = await supabase
        .from('queue_entries')
        .insert({
          member_id: memberId,
          citizen_id: citizenId,
          status: 'waiting',
          last_heartbeat_at: new Date().toISOString(),
        });

      // Check if insert failed (ignore duplicate key errors - code 23505)
      if (insertError && !insertError.message?.includes('duplicate')) {
        console.error(`[speak] citizenId=${citizenId} fallback insert failed:`, insertError);
        return NextResponse.json({ error: 'Failed to join queue' }, { status: 500 });
      }

      // Verify user is actually in queue and get position
      const { data: queueEntry } = await supabase
        .from('queue_entries')
        .select('id, joined_at')
        .eq('member_id', memberId)
        .eq('citizen_id', citizenId)
        .eq('status', 'waiting')
        .maybeSingle();

      if (!queueEntry) {
        console.error(`[speak] citizenId=${citizenId} not found in queue after fallback insert`);
        return NextResponse.json({ error: 'Failed to join queue' }, { status: 500 });
      }

      // Get queue position and length
      const [positionResult, lengthResult] = await Promise.all([
        supabase.rpc('get_queue_position', { p_member_id: memberId, p_citizen_id: citizenId }),
        supabase.rpc('get_queue_length', { p_member_id: memberId }),
      ]);

      // Position is 0-indexed (0 = first), convert to 1-indexed for UI
      const position = (positionResult.data ?? 0) + 1;

      console.log(`[speak] citizenId=${citizenId} QUEUED via fallback - position=${position} queueLength=${lengthResult.data}`);

      return NextResponse.json({
        action: 'queued',
        position,
        queueLength: lengthResult.data ?? 1,
      });
    }

    const speakResult = (result as { action: string; turn_id: string | null; session_id: string | null; queue_position: number | null; queue_length: number }[])?.[0];

    if (!speakResult) {
      // No result but no error - treat as queued
      console.log(`[speak] citizenId=${citizenId} QUEUED (no speakResult, treating as queued)`);
      return NextResponse.json({
        action: 'queued',
        position: 1,
        queueLength: 1,
      });
    }

    // If we got queued (race lost), return early - client keeps message in input
    // Note: queue_position from DB is 0-indexed, convert to 1-indexed for UI
    if (speakResult.action === 'queued' || speakResult.action === 'already_in_queue') {
      const position = (speakResult.queue_position ?? 0) + 1;
      console.log(`[speak] citizenId=${citizenId} QUEUED via try_speak - action=${speakResult.action} position=${position}`);
      return NextResponse.json({
        action: 'queued',
        position,
        queueLength: speakResult.queue_length,
      });
    }

    // Handle already_has_turn - user is trying to speak during their existing turn
    // This can happen due to race conditions or retries
    if (speakResult.action === 'already_has_turn' && speakResult.turn_id) {
      console.log(`[speak] citizenId=${citizenId} already_has_turn - fetching session and proceeding`);

      // Get the session_id from the existing turn
      const { data: existingTurn } = await supabase
        .from('turns')
        .select('session_id')
        .eq('id', speakResult.turn_id)
        .single();

      if (!existingTurn?.session_id) {
        console.error(`[speak] citizenId=${citizenId} already_has_turn but no session found`);
        return NextResponse.json({ error: 'Turn session not found' }, { status: 500 });
      }

      // Use the existing turn - override speakResult values
      speakResult.session_id = existingTurn.session_id;
      speakResult.action = 'turn_started'; // Treat as turn_started for the rest of the flow
    }

    // We got the turn! Now send the message
    if (speakResult.action === 'turn_started') {
      // If turn_started but missing IDs, something went wrong - treat as queued
      if (!speakResult.turn_id || !speakResult.session_id) {
        console.error(`[speak] citizenId=${citizenId} turn_started but missing IDs - treating as queued`, {
          turn_id: speakResult.turn_id,
          session_id: speakResult.session_id,
        });
        return NextResponse.json({
          action: 'queued',
          position: (speakResult.queue_position ?? 0) + 1,
          queueLength: speakResult.queue_length ?? 1,
        });
      }
      console.log(`[speak] citizenId=${citizenId} GOT TURN - turnId=${speakResult.turn_id}`);
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
      const nowDate = new Date();
      const now = nowDate.toISOString();
      const councilNow = new Date(nowDate.getTime() + 1).toISOString(); // +1ms for ordering
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
        created_at: councilNow,
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
        try {
          const result = await startNextTurn(memberId);
          if (!result.success && result.error !== 'Queue is empty') {
            console.error('Error auto-starting next turn:', result.error);
          }
        } catch (e) {
          console.error('Error auto-starting next turn:', e);
        }
      });

      console.log(`[speak] citizenId=${citizenId} SENT successfully`);
      return NextResponse.json({
        action: 'sent',
        citizenMessage,
        councilMessage,
        queueLength: 0, // Approximate - real value comes from broadcast
      });
    }

    console.error(`[speak] citizenId=${citizenId} FAILED - unexpected state`, {
      action: speakResult?.action,
      turn_id: speakResult?.turn_id,
      session_id: speakResult?.session_id,
      queue_position: speakResult?.queue_position,
      full_result: JSON.stringify(speakResult),
    });
    return NextResponse.json({ error: 'Unexpected state' }, { status: 500 });
  } catch (error) {
    console.error(`[speak] FAILED - caught error:`, error);
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 });
  }
}
