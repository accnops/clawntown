import type { CouncilMember, CouncilMemberState, OfficeHours } from '@clawntown/shared';
import { queryTownData, insertTownData, updateTownData } from '../db/town-data.js';
import { councilMembers } from './members.js';

function isWithinOfficeHours(schedule: OfficeHours[], now: Date): boolean {
  const day = now.getDay();
  const hour = now.getHours();

  return schedule.some(
    oh => oh.dayOfWeek === day && hour >= oh.startHour && hour < oh.endHour
  );
}

function getSessionEndTime(schedule: OfficeHours[], now: Date): Date | null {
  const day = now.getDay();
  const hour = now.getHours();

  const currentSlot = schedule.find(
    oh => oh.dayOfWeek === day && hour >= oh.startHour && hour < oh.endHour
  );

  if (!currentSlot) return null;

  const endTime = new Date(now);
  endTime.setHours(currentSlot.endHour, 0, 0, 0);
  return endTime;
}

export async function getCouncilMemberState(memberId: string): Promise<CouncilMemberState | null> {
  const records = await queryTownData<CouncilMemberState>('council_state', { index_1: memberId });
  return records[0]?.data ?? null;
}

export async function updateCouncilStates(): Promise<{
  wentOnline: CouncilMember[];
  wentOffline: CouncilMember[];
}> {
  const now = new Date();
  const wentOnline: CouncilMember[] = [];
  const wentOffline: CouncilMember[] = [];

  for (const member of councilMembers) {
    const shouldBeOnline = isWithinOfficeHours(member.schedule, now);
    const records = await queryTownData<CouncilMemberState>('council_state', { index_1: member.id });
    const existingRecord = records[0];
    const currentState = existingRecord?.data;

    if (shouldBeOnline && !currentState?.isOnline) {
      // Going online
      const sessionId = crypto.randomUUID();
      const newState: CouncilMemberState = {
        memberId: member.id,
        isOnline: true,
        currentSessionId: sessionId,
        sessionStartedAt: now,
        sessionEndsAt: getSessionEndTime(member.schedule, now),
      };

      if (existingRecord) {
        await updateTownData(existingRecord.id, newState);
      } else {
        await insertTownData('council_state', newState, { index_1: member.id });
      }
      wentOnline.push(member);
    } else if (!shouldBeOnline && currentState?.isOnline) {
      // Going offline
      const newState: CouncilMemberState = {
        memberId: member.id,
        isOnline: false,
        currentSessionId: null,
        sessionStartedAt: null,
        sessionEndsAt: null,
      };

      if (existingRecord) {
        await updateTownData(existingRecord.id, newState);
      }
      wentOffline.push(member);
    }
  }

  return { wentOnline, wentOffline };
}

export async function getAllOnlineMembers(): Promise<CouncilMember[]> {
  const states = await queryTownData<CouncilMemberState>('council_state', { index_3: 'online' });
  return states
    .filter(s => s.data.isOnline)
    .map(s => councilMembers.find(m => m.id === s.data.memberId)!)
    .filter(Boolean);
}
