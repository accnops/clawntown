// apps/web/src/lib/kv.ts
import { kv as vercelKv } from '@vercel/kv';

// Check if Vercel KV is configured
export const isKvConfigured = !!(
  process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
);

// Create a mock KV client for local development without credentials
const mockKv = {
  get: async () => null,
  set: async () => 'OK',
  del: async () => 0,
  lrange: async () => [],
  rpush: async () => 0,
  lpop: async () => null,
};

// Re-export for use across the app - use mock if not configured
export const kv = isKvConfigured ? vercelKv : mockKv;

// Key prefixes for organization
export const KV_KEYS = {
  queue: (memberId: string) => `queue:${memberId}`,
  turn: (memberId: string) => `turn:${memberId}`,
  spectators: (memberId: string) => `spectators:${memberId}`,
  online: (memberId: string) => `online:${memberId}`,
  session: (memberId: string) => `session:${memberId}`,
} as const;
