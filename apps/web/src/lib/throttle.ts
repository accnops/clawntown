import { getSupabaseAdmin } from './supabase-server';

const MESSAGE_COOLDOWN_MS = 5000; // 5 seconds

export async function checkMessageThrottle(
  citizenId: string
): Promise<{ allowed: boolean; waitSeconds?: number }> {
  const supabase = getSupabaseAdmin();
  const { data: userData } = await supabase.auth.admin.getUserById(citizenId);
  const lastMessageAt = userData?.user?.user_metadata?.last_message_at;

  if (lastMessageAt) {
    const timeSinceLast = Date.now() - new Date(lastMessageAt).getTime();
    if (timeSinceLast < MESSAGE_COOLDOWN_MS) {
      return {
        allowed: false,
        waitSeconds: Math.ceil((MESSAGE_COOLDOWN_MS - timeSinceLast) / 1000),
      };
    }
  }
  return { allowed: true };
}

export async function recordMessageSent(citizenId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.auth.admin.updateUserById(citizenId, {
    user_metadata: { last_message_at: new Date().toISOString() },
  });
}
