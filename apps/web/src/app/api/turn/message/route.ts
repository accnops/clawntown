import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { generateCouncilResponse, isGeminiConfigured } from '@/lib/gemini';
import { getCouncilMember } from '@/data/council-members';

export async function POST(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin();
    const { memberId, citizenId, content } = await request.json();

    if (!memberId || !citizenId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Get current turn
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

    // Check character limit
    const newCharsUsed = turn.chars_used + content.length;
    if (newCharsUsed > turn.char_budget) {
      return NextResponse.json({
        error: 'Character budget exceeded',
        remainingChars: turn.char_budget - turn.chars_used,
      }, { status: 400 });
    }

    // Get citizen info for the message
    const { data: citizen } = await supabase
      .from('citizens')
      .select('name')
      .eq('id', citizenId)
      .single();

    const citizenName = citizen?.name || 'Citizen';

    // Get council member personality
    const councilMember = getCouncilMember(memberId);
    if (!councilMember) {
      return NextResponse.json({ error: 'Council member not found' }, { status: 404 });
    }

    // Save citizen message
    const { data: citizenMessage, error: msgError } = await supabase
      .from('conversation_messages')
      .insert({
        session_id: turn.session_id,
        role: 'citizen',
        citizen_id: citizenId,
        citizen_name: citizenName,
        content,
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
        // Fetch recent conversation history
        const { data: historyData } = await supabase
          .from('conversation_messages')
          .select('role, content')
          .eq('session_id', turn.session_id)
          .order('created_at', { ascending: true })
          .limit(10);

        const conversationHistory = (historyData || []).map(msg => ({
          role: msg.role as 'citizen' | 'council',
          content: msg.content,
        }));

        // Generate response
        const responseText = await generateCouncilResponse(
          councilMember.personality,
          citizenName,
          content,
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
      shouldEnd,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
