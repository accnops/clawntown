import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase-server';
import { COUNCIL_MEMBERS, getCouncilMember } from '@/data/council-members';
import { generateCouncilResponse, isGeminiConfigured } from '@/lib/gemini';

// Vercel Cron - runs every hour at minute 0
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const supabase = getSupabaseAdmin();
  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentDay = now.getUTCDay();

  const results: string[] = [];

  for (const member of COUNCIL_MEMBERS) {
    // Check if member's office hours are ending
    const isEnding = member.schedule.some(
      (s) => s.dayOfWeek === currentDay && s.endHour === currentHour
    );

    if (!isEnding) continue;

    // Find active session for this member
    const { data: session } = await supabase
      .from('conversation_sessions')
      .select('id')
      .eq('member_id', member.id)
      .eq('status', 'active')
      .single();

    if (!session) continue;

    // Generate farewell message if Gemini is configured
    if (isGeminiConfigured()) {
      const councilMember = getCouncilMember(member.id);
      if (councilMember) {
        try {
          const farewellMessage = await generateCouncilResponse(
            councilMember.personality,
            'System',
            'Office hours are ending. Please say a brief, warm farewell to the citizens watching.',
            []
          );

          // Save farewell message
          await supabase
            .from('conversation_messages')
            .insert({
              session_id: session.id,
              role: 'council',
              citizen_id: null,
              citizen_name: null,
              content: farewellMessage,
            });

          // Broadcast farewell to watchers
          const channel = supabase.channel(`council:${member.id}`);
          await channel.httpSend('message', {
            message: {
              id: `farewell-${Date.now()}`,
              session_id: session.id,
              role: 'council',
              content: farewellMessage,
              created_at: new Date().toISOString(),
            },
          });
        } catch (error) {
          console.error(`Failed to generate farewell for ${member.name}:`, error);
        }
      }
    }

    // End any active turn
    await supabase
      .from('turns')
      .update({ ended_at: now.toISOString() })
      .eq('member_id', member.id)
      .is('ended_at', null);

    // Skip all waiting queue entries
    await supabase
      .from('queue_entries')
      .update({ status: 'skipped' })
      .eq('member_id', member.id)
      .in('status', ['waiting', 'ready_check', 'confirmed']);

    // Close the session
    await supabase
      .from('conversation_sessions')
      .update({ status: 'ended', ended_at: now.toISOString() })
      .eq('id', session.id);

    results.push(`Closed ${member.name}'s office`);
  }

  return NextResponse.json({ processed: results });
}
