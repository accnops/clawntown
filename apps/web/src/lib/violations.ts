import { getSupabaseAdmin } from '@/lib/supabase-server';
import { insertTownData, queryTownData } from '@/lib/supabase';
import type { ViolationLog } from '@clawntown/shared';

const BAN_DURATION_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const VIOLATION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface ViolationResult {
  recorded: boolean;
  isBanned: boolean;
  bannedUntil?: Date;
  violationCount: number;
}

export async function recordViolation(
  citizenId: string,
  violationType: ViolationLog['violationType'],
  messageContent: string,
  turnId: string
): Promise<ViolationResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { recorded: false, isBanned: false, violationCount: 0 };
  }

  const now = new Date();

  // Record the violation
  const violation: Omit<ViolationLog, 'id'> = {
    citizenId,
    occurredAt: now,
    violationType,
    messageContent: messageContent.substring(0, 500), // Truncate for storage
    turnId,
  };

  await insertTownData('violation_log', violation, {
    index_1: citizenId,
    index_2: violationType,
  });

  // Count recent violations (last 30 days)
  const violations = await queryTownData<ViolationLog>('violation_log', {
    index_1: citizenId,
  });

  const thirtyDaysAgo = new Date(now.getTime() - VIOLATION_WINDOW_MS);
  const recentViolations = violations.filter(
    (v) => new Date(v.data.occurredAt) > thirtyDaysAgo
  );

  const violationCount = recentViolations.length;

  // Second violation = 7-day ban
  if (violationCount >= 2) {
    const bannedUntil = new Date(now.getTime() + BAN_DURATION_MS);

    // Update user metadata with ban
    await supabase.auth.admin.updateUserById(citizenId, {
      user_metadata: {
        banned_until: bannedUntil.toISOString(),
        violation_count: violationCount,
      },
    });

    return {
      recorded: true,
      isBanned: true,
      bannedUntil,
      violationCount,
    };
  }

  // First violation - just record it
  await supabase.auth.admin.updateUserById(citizenId, {
    user_metadata: {
      violation_count: violationCount,
    },
  });

  return {
    recorded: true,
    isBanned: false,
    violationCount,
  };
}
