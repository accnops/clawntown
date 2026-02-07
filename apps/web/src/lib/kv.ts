// apps/web/src/lib/kv.ts
import { kv } from '@vercel/kv';

// Re-export for use across the app
export { kv };

// Key prefixes for organization
export const KV_KEYS = {
  queue: (memberId: string) => `queue:${memberId}`,
  turn: (memberId: string) => `turn:${memberId}`,
  spectators: (memberId: string) => `spectators:${memberId}`,
  online: (memberId: string) => `online:${memberId}`,
  session: (memberId: string) => `session:${memberId}`,
} as const;
