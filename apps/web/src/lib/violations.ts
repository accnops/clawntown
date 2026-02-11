import { getSupabaseAdmin } from '@/lib/supabase-server';
import type { ViolationLog } from '@clawntown/shared';

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

  // Get user's email from auth
  const { data: userData } = await supabase.auth.admin.getUserById(citizenId);
  const email = userData?.user?.email;

  if (!email) {
    console.error('Could not find email for citizen:', citizenId);
    return { recorded: false, isBanned: false, violationCount: 0 };
  }

  // Call the database function that tracks by email
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('record_violation', {
    p_email: email,
    p_citizen_id: citizenId,
    p_turn_id: turnId,
    p_violation_type: violationType,
    p_message_content: messageContent,
  });

  if (error) {
    console.error('Error recording violation:', error);
    return { recorded: false, isBanned: false, violationCount: 0 };
  }

  const results = data as { violation_count: number; is_banned: boolean; banned_until: string | null }[] | null;
  const result = results?.[0];
  if (!result) {
    return { recorded: true, isBanned: false, violationCount: 1 };
  }

  return {
    recorded: true,
    isBanned: result.is_banned,
    bannedUntil: result.banned_until ? new Date(result.banned_until) : undefined,
    violationCount: result.violation_count,
  };
}

export async function isEmailBanned(email: string): Promise<{ isBanned: boolean; bannedUntil?: Date }> {
  const supabase = getSupabaseAdmin();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)('is_email_banned', {
    p_email: email,
  });

  const results = data as { is_banned: boolean; banned_until: string | null }[] | null;
  if (error || !results?.[0]) {
    return { isBanned: false };
  }

  return {
    isBanned: results[0].is_banned,
    bannedUntil: results[0].banned_until ? new Date(results[0].banned_until) : undefined,
  };
}
