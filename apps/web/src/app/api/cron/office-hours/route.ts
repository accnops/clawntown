import { NextRequest, NextResponse } from 'next/server';
import { COUNCIL_MEMBERS } from '@/data/council-members';
import { queryTownData, updateTownData } from '@/lib/supabase';
import { generateCouncilResponse } from '@/lib/gemini';
import type { ChatSession, QueueEntry } from '@clawntown/shared';

// Vercel Cron - runs every hour at minute 0
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Also allow in development without secret
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const now = new Date();
  const currentHour = now.getUTCHours();
  const currentDay = now.getUTCDay();

  const results: string[] = [];

  for (const member of COUNCIL_MEMBERS) {
    // Check if member's office hours are ending
    const currentSchedule = member.schedule.find(
      (s) => s.dayOfWeek === currentDay && s.endHour === currentHour
    );

    if (!currentSchedule) continue;

    // Find active session for this member
    const sessions = await queryTownData<ChatSession>('chat_session', {
      index_1: member.id,
      index_2: 'active',
    });

    const activeSession = sessions[0];
    if (!activeSession || activeSession.data.farewellSent) continue;

    // Generate farewell message
    const farewellMessage = await generateCouncilResponse(
      member.personality,
      'System',
      'Office hours are ending. Please say a brief, warm farewell to the citizens.',
      []
    );

    // Mark session as closing and set farewell sent
    await updateTownData(activeSession.id, {
      ...activeSession.data,
      farewellSent: true,
      status: 'closing',
    });

    // Clear the queue
    const queueEntries = await queryTownData<QueueEntry>('queue_entry', {
      index_1: member.id,
    });

    for (const entry of queueEntries) {
      if (entry.data.status !== 'completed' && entry.data.status !== 'skipped') {
        await updateTownData(entry.id, {
          ...entry.data,
          status: 'skipped',
        });
      }
    }

    // Mark session as closed
    await updateTownData(activeSession.id, {
      ...activeSession.data,
      status: 'closed',
      endedAt: new Date(),
      farewellSent: true,
    });

    results.push(`Closed ${member.name}'s office`);
  }

  return NextResponse.json({ processed: results });
}
