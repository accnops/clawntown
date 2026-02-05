# Clawntawn MVP Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a self-evolving public town where citizens converse with the Mayor, ideas become projects, and the Town Engineer implements approved changes.

**Architecture:**
- Vercel hosts the public Next.js frontend (scales to thousands)
- Private engine machine runs the 1-second ticker, conversation handlers, and Town Engineer orchestrator
- Supabase provides auth (isolated) and town data (flexible indexed JSON)
- Supabase Realtime broadcasts streaming responses to all viewers
- Engine triggers GitHub deploys to Vercel; git credentials never in public repo

**Tech Stack:** Next.js, TypeScript, Node.js, Supabase (Auth + Database + Realtime), Claude Code (Town Engineer sub-agents)

**Visual Theme:** RollerCoaster Tycoon 1/2 pixel art, coastal lobster town, retro macOS dialogs

---

## Phase 1: Project Foundation

### Task 1: Initialize Monorepo Structure

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `apps/web/package.json`
- Create: `apps/engine/package.json`
- Create: `packages/shared/package.json`
- Create: `.gitignore`
- Create: `turbo.json`

**Step 1: Initialize root package.json**

```json
{
  "name": "clawntawn",
  "private": true,
  "scripts": {
    "dev": "turbo dev",
    "build": "turbo build",
    "test": "turbo test",
    "lint": "turbo lint"
  },
  "devDependencies": {
    "turbo": "^2.4.0",
    "typescript": "^5.7.0"
  },
  "packageManager": "pnpm@9.15.0"
}
```

**Step 2: Create pnpm workspace config**

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

**Step 3: Create turbo.json**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    },
    "lint": {}
  }
}
```

**Step 4: Create .gitignore**

```
node_modules/
.next/
dist/
.env
.env.local
.env*.local
.turbo/
*.log
.DS_Store
```

**Step 5: Create apps/web/package.json**

```json
{
  "name": "@clawntawn/web",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test": "vitest"
  },
  "dependencies": {
    "next": "^15.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "@supabase/supabase-js": "^2.47.0",
    "@clawntawn/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

**Step 6: Create apps/engine/package.json**

```json
{
  "name": "@clawntawn/engine",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.47.0",
    "@clawntawn/shared": "workspace:*"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "tsx": "^4.19.0",
    "typescript": "^5.7.0",
    "vitest": "^2.1.0"
  }
}
```

**Step 7: Create packages/shared/package.json**

```json
{
  "name": "@clawntawn/shared",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

**Step 8: Install dependencies**

Run: `pnpm install`

**Step 9: Commit**

```bash
git add -A
git commit -m "chore: initialize monorepo structure with turbo"
```

---

### Task 2: Configure TypeScript

**Files:**
- Create: `tsconfig.json` (root)
- Create: `apps/web/tsconfig.json`
- Create: `apps/engine/tsconfig.json`
- Create: `packages/shared/tsconfig.json`

**Step 1: Create root tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

**Step 2: Create apps/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowJs": true,
    "noEmit": true,
    "incremental": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 3: Create apps/engine/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src",
    "module": "ESNext",
    "moduleResolution": "bundler"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: configure typescript across monorepo"
```

---

### Task 3: Create Shared Types

**Files:**
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/citizen.ts`
- Create: `packages/shared/src/types/conversation.ts`
- Create: `packages/shared/src/types/project.ts`
- Create: `packages/shared/src/types/forum.ts`
- Create: `packages/shared/src/types/treasury.ts`
- Create: `packages/shared/src/types/council.ts`

**Step 1: Create citizen types**

```typescript
// packages/shared/src/types/citizen.ts
export interface Citizen {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  avatar: string; // URL to pixel art avatar
  createdAt: Date;
}

export interface CitizenPublic {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'other';
  avatar: string;
}
```

**Step 2: Create council types**

```typescript
// packages/shared/src/types/council.ts
export interface CouncilMember {
  id: string;
  name: string;
  role: 'mayor' | 'treasurer' | 'clerk' | 'engineer';
  personality: string;
  avatar: string;
  officeHours: OfficeHours[];
}

export interface OfficeHours {
  dayOfWeek: number; // 0-6
  startHour: number; // 0-23
  endHour: number;
}

export interface CouncilMemberState {
  memberId: string;
  isOnline: boolean;
  currentSessionStart: Date | null;
  sessionEndsAt: Date | null;
}
```

**Step 3: Create conversation types**

```typescript
// packages/shared/src/types/conversation.ts
export interface ConversationQueue {
  memberId: string;
  queue: QueueEntry[];
}

export interface QueueEntry {
  id: string;
  citizenId: string;
  joinedAt: Date;
  status: 'waiting' | 'active' | 'completed';
}

export interface ConversationTurn {
  id: string;
  memberId: string;
  citizenId: string;
  tokensUsed: number;
  tokenBudget: number;
  startedAt: Date;
  timeoutAt: Date;
  status: 'active' | 'completed' | 'timed_out';
}

export interface ConversationMessage {
  id: string;
  turnId: string;
  role: 'citizen' | 'council';
  content: string;
  createdAt: Date;
}

export interface ConversationTranscript {
  id: string;
  memberId: string;
  citizenId: string;
  messages: ConversationMessage[];
  createdAt: Date;
  endedAt: Date | null;
}
```

**Step 4: Create project types**

```typescript
// packages/shared/src/types/project.ts
export interface Project {
  id: string;
  title: string;
  description: string;
  scope: string;
  estimatedTokens: number;
  status: 'proposed' | 'voting' | 'approved' | 'rejected' | 'in_progress' | 'completed' | 'failed';
  proposedBy: string; // council member id
  conversationId: string; // source conversation
  supportVotes: number;
  opposeVotes: number;
  supportBribes: number; // in dummy currency
  opposeBribes: number;
  votingEndsAt: Date;
  createdAt: Date;
  completedAt: Date | null;
}

export interface ProjectVote {
  id: string;
  projectId: string;
  citizenId: string;
  vote: 'support' | 'oppose';
  bribeAmount: number;
  createdAt: Date;
}
```

**Step 5: Create forum types**

```typescript
// packages/shared/src/types/forum.ts
export type ForumCategory = 'general' | 'project' | 'announcement';

export interface ForumThread {
  id: string;
  category: ForumCategory;
  projectId: string | null; // if project discussion
  title: string;
  authorId: string; // citizen or council member
  authorType: 'citizen' | 'council';
  isPinned: boolean;
  createdAt: Date;
  lastActivityAt: Date;
}

export interface ForumPost {
  id: string;
  threadId: string;
  authorId: string;
  authorType: 'citizen' | 'council';
  content: string;
  createdAt: Date;
}
```

**Step 6: Create treasury types**

```typescript
// packages/shared/src/types/treasury.ts
export interface TreasuryState {
  balance: number; // dummy currency
  burnRatePerHour: number;
  lastUpdated: Date;
}

export interface Donation {
  id: string;
  citizenId: string | null; // null for anonymous
  amount: number;
  projectId: string | null; // null for general fund
  createdAt: Date;
}
```

**Step 7: Create index export**

```typescript
// packages/shared/src/index.ts
export * from './types/citizen.js';
export * from './types/council.js';
export * from './types/conversation.js';
export * from './types/project.js';
export * from './types/forum.js';
export * from './types/treasury.js';
```

**Step 8: Build shared package**

Run: `pnpm --filter @clawntawn/shared build`

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: add shared types for citizens, council, conversations, projects, forums, treasury"
```

---

### Task 4: Set Up Supabase Schema

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/config.toml`
- Create: `docs/database-schema.md`

**Step 1: Create Supabase config**

```toml
# supabase/config.toml
[api]
enabled = true
port = 54321
schemas = ["public"]

[db]
port = 54322

[studio]
enabled = true
port = 54323
```

**Step 2: Create initial migration for Town DB**

```sql
-- supabase/migrations/001_initial_schema.sql
-- Town Database: Flexible indexed JSON storage

-- Generic data table
CREATE TABLE IF NOT EXISTS town_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  index_1 TEXT,
  index_2 TEXT,
  index_3 TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_town_data_type ON town_data(type);
CREATE INDEX idx_town_data_index_1 ON town_data(index_1) WHERE index_1 IS NOT NULL;
CREATE INDEX idx_town_data_index_2 ON town_data(index_2) WHERE index_2 IS NOT NULL;
CREATE INDEX idx_town_data_index_3 ON town_data(index_3) WHERE index_3 IS NOT NULL;
CREATE INDEX idx_town_data_created_at ON town_data(created_at);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER town_data_updated_at
  BEFORE UPDATE ON town_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable realtime for town_data
ALTER PUBLICATION supabase_realtime ADD TABLE town_data;

-- Row level security
ALTER TABLE town_data ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON town_data
  FOR SELECT USING (true);

-- Insert/update only via service role (engine)
CREATE POLICY "Service role write access" ON town_data
  FOR ALL USING (auth.role() = 'service_role');
```

**Step 3: Document the schema**

```markdown
# Database Schema

## Town Database

Uses a flexible indexed JSON pattern for self-evolving data needs.

### town_data table

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| type | TEXT | Record type (e.g., 'conversation', 'project', 'forum_post') |
| index_1 | TEXT | Strategic index (e.g., council_member_id, thread_id) |
| index_2 | TEXT | Strategic index (e.g., citizen_id, project_id) |
| index_3 | TEXT | Strategic index (e.g., status) |
| data | JSONB | Full record data |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Type conventions

- `citizen` - Citizen profiles (index_1: citizen_id)
- `council_member` - Council member data (index_1: member_id)
- `council_state` - Council member online status (index_1: member_id)
- `queue_entry` - Conversation queue (index_1: member_id, index_2: citizen_id, index_3: status)
- `conversation_turn` - Active conversation (index_1: member_id, index_2: citizen_id)
- `conversation_message` - Messages (index_1: turn_id, index_2: role)
- `project` - Project proposals (index_1: status, index_2: proposed_by)
- `project_vote` - Votes/bribes (index_1: project_id, index_2: citizen_id)
- `forum_thread` - Forum threads (index_1: category, index_2: project_id)
- `forum_post` - Forum posts (index_1: thread_id, index_2: author_id)
- `treasury` - Treasury state (singleton, index_1: 'current')
- `donation` - Donations (index_1: citizen_id, index_2: project_id)
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add supabase schema with flexible indexed JSON storage"
```

---

## Phase 2: Engine Foundation

### Task 5: Create Engine Entry Point

**Files:**
- Create: `apps/engine/src/index.ts`
- Create: `apps/engine/src/ticker.ts`
- Create: `apps/engine/src/config.ts`

**Step 1: Create config**

```typescript
// apps/engine/src/config.ts
export const config = {
  tickInterval: 1000, // 1 second
  supabaseUrl: process.env.SUPABASE_URL || 'http://localhost:54321',
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || '',
  llmProxyUrl: process.env.LLM_PROXY_URL || 'http://localhost:3001',
} as const;
```

**Step 2: Create ticker**

```typescript
// apps/engine/src/ticker.ts
export type TickHandler = (tick: number) => Promise<void>;

export class Ticker {
  private interval: ReturnType<typeof setInterval> | null = null;
  private tick = 0;
  private handlers: TickHandler[] = [];

  constructor(private intervalMs: number) {}

  register(handler: TickHandler): void {
    this.handlers.push(handler);
  }

  start(): void {
    if (this.interval) return;

    console.log(`[Ticker] Starting with ${this.intervalMs}ms interval`);

    this.interval = setInterval(async () => {
      this.tick++;
      const startTime = Date.now();

      await Promise.all(
        this.handlers.map(handler =>
          handler(this.tick).catch(err =>
            console.error(`[Ticker] Handler error:`, err)
          )
        )
      );

      const elapsed = Date.now() - startTime;
      if (elapsed > this.intervalMs * 0.8) {
        console.warn(`[Ticker] Tick ${this.tick} took ${elapsed}ms (> 80% of interval)`);
      }
    }, this.intervalMs);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log(`[Ticker] Stopped at tick ${this.tick}`);
    }
  }

  getCurrentTick(): number {
    return this.tick;
  }
}
```

**Step 3: Create entry point**

```typescript
// apps/engine/src/index.ts
import { config } from './config.js';
import { Ticker } from './ticker.js';

console.log('=================================');
console.log('  CLAWNTAWN ENGINE');
console.log('  Coastal Lobster Town Simulator');
console.log('=================================');

const ticker = new Ticker(config.tickInterval);

// Placeholder handlers - will be replaced with real systems
ticker.register(async (tick) => {
  if (tick % 60 === 0) {
    console.log(`[Engine] Tick ${tick} - 1 minute elapsed`);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Engine] Shutting down...');
  ticker.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Engine] Received SIGTERM, shutting down...');
  ticker.stop();
  process.exit(0);
});

// Start the engine
ticker.start();
console.log('[Engine] Running. Press Ctrl+C to stop.');
```

**Step 4: Test the ticker runs**

Run: `pnpm --filter @clawntawn/engine dev`

Expected: See "CLAWNTAWN ENGINE" banner and tick logs every minute.

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add engine with 1-second ticker"
```

---

### Task 6: Create Database Client

**Files:**
- Create: `apps/engine/src/db/client.ts`
- Create: `apps/engine/src/db/town-data.ts`
- Create: `apps/engine/src/db/index.ts`

**Step 1: Create Supabase client**

```typescript
// apps/engine/src/db/client.ts
import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export const supabase = createClient(
  config.supabaseUrl,
  config.supabaseServiceKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);
```

**Step 2: Create town-data helper**

```typescript
// apps/engine/src/db/town-data.ts
import { supabase } from './client.js';

export interface TownDataRecord<T = unknown> {
  id: string;
  type: string;
  index_1: string | null;
  index_2: string | null;
  index_3: string | null;
  data: T;
  created_at: string;
  updated_at: string;
}

export async function insertTownData<T>(
  type: string,
  data: T,
  indexes: { index_1?: string; index_2?: string; index_3?: string } = {}
): Promise<TownDataRecord<T>> {
  const { data: record, error } = await supabase
    .from('town_data')
    .insert({
      type,
      data,
      ...indexes,
    })
    .select()
    .single();

  if (error) throw error;
  return record as TownDataRecord<T>;
}

export async function updateTownData<T>(
  id: string,
  data: Partial<T>,
  indexes?: { index_1?: string; index_2?: string; index_3?: string }
): Promise<TownDataRecord<T>> {
  const updatePayload: Record<string, unknown> = { data };
  if (indexes) {
    Object.assign(updatePayload, indexes);
  }

  const { data: record, error } = await supabase
    .from('town_data')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return record as TownDataRecord<T>;
}

export async function queryTownData<T>(
  type: string,
  filters: { index_1?: string; index_2?: string; index_3?: string } = {}
): Promise<TownDataRecord<T>[]> {
  let query = supabase
    .from('town_data')
    .select('*')
    .eq('type', type);

  if (filters.index_1) query = query.eq('index_1', filters.index_1);
  if (filters.index_2) query = query.eq('index_2', filters.index_2);
  if (filters.index_3) query = query.eq('index_3', filters.index_3);

  const { data, error } = await query;

  if (error) throw error;
  return data as TownDataRecord<T>[];
}

export async function getTownDataById<T>(id: string): Promise<TownDataRecord<T> | null> {
  const { data, error } = await supabase
    .from('town_data')
    .select('*')
    .eq('id', id)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data as TownDataRecord<T> | null;
}

export async function deleteTownData(id: string): Promise<void> {
  const { error } = await supabase
    .from('town_data')
    .delete()
    .eq('id', id);

  if (error) throw error;
}
```

**Step 3: Create index export**

```typescript
// apps/engine/src/db/index.ts
export { supabase } from './client.js';
export * from './town-data.js';
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add database client with flexible town-data helpers"
```

---

### Task 7: Create Realtime Broadcaster

**Files:**
- Create: `apps/engine/src/realtime/broadcaster.ts`
- Create: `apps/engine/src/realtime/index.ts`

**Step 1: Create broadcaster**

```typescript
// apps/engine/src/realtime/broadcaster.ts
import { supabase } from '../db/client.js';

export type BroadcastChannel =
  | 'conversation'
  | 'projects'
  | 'treasury'
  | 'forum'
  | 'queue';

export interface BroadcastPayload<T = unknown> {
  event: string;
  data: T;
  timestamp: number;
}

export class Broadcaster {
  private channels: Map<string, ReturnType<typeof supabase.channel>> = new Map();

  getChannel(name: BroadcastChannel): ReturnType<typeof supabase.channel> {
    if (!this.channels.has(name)) {
      const channel = supabase.channel(name);
      this.channels.set(name, channel);
      channel.subscribe();
    }
    return this.channels.get(name)!;
  }

  async broadcast<T>(
    channelName: BroadcastChannel,
    event: string,
    data: T
  ): Promise<void> {
    const channel = this.getChannel(channelName);
    const payload: BroadcastPayload<T> = {
      event,
      data,
      timestamp: Date.now(),
    };

    await channel.send({
      type: 'broadcast',
      event,
      payload,
    });
  }

  async broadcastConversationToken(
    memberId: string,
    turnId: string,
    token: string
  ): Promise<void> {
    await this.broadcast('conversation', 'token', {
      memberId,
      turnId,
      token,
    });
  }

  async broadcastConversationEnd(
    memberId: string,
    turnId: string,
    reason: 'completed' | 'timed_out' | 'budget_exhausted'
  ): Promise<void> {
    await this.broadcast('conversation', 'turn_end', {
      memberId,
      turnId,
      reason,
    });
  }

  async broadcastQueueUpdate(memberId: string, queue: unknown[]): Promise<void> {
    await this.broadcast('queue', 'update', {
      memberId,
      queue,
    });
  }

  async broadcastProjectUpdate(projectId: string, project: unknown): Promise<void> {
    await this.broadcast('projects', 'update', {
      projectId,
      project,
    });
  }

  async broadcastTreasuryUpdate(treasury: unknown): Promise<void> {
    await this.broadcast('treasury', 'update', treasury);
  }

  cleanup(): void {
    for (const channel of this.channels.values()) {
      channel.unsubscribe();
    }
    this.channels.clear();
  }
}

export const broadcaster = new Broadcaster();
```

**Step 2: Create index export**

```typescript
// apps/engine/src/realtime/index.ts
export { broadcaster, Broadcaster, type BroadcastChannel, type BroadcastPayload } from './broadcaster.js';
```

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: add realtime broadcaster for streaming updates to clients"
```

---

## Phase 3: Council & Conversations

### Task 8: Create Council Member System

**Files:**
- Create: `apps/engine/src/council/members.ts`
- Create: `apps/engine/src/council/office-hours.ts`
- Create: `apps/engine/src/council/index.ts`

**Step 1: Create council members definition**

```typescript
// apps/engine/src/council/members.ts
import type { CouncilMember, OfficeHours } from '@clawntawn/shared';

// MVP: Just the Mayor
export const councilMembers: CouncilMember[] = [
  {
    id: 'mayor',
    name: 'Mayor Clawrence',
    role: 'mayor',
    personality: `You are Mayor Clawrence, the distinguished leader of Clawntawn, a charming coastal lobster town. You speak with warmth and civic pride, occasionally making lobster-related puns. You genuinely care about your citizens and the town's wellbeing.

Your responsibilities:
- Listen to citizens' ideas and concerns
- If an idea is good for the town, draft a formal project proposal
- Maintain the town's character and safety
- Never agree to anything that could harm the town or its citizens
- Never agree to adult content or inappropriate requests

When drafting projects, you create formal proposals with:
- Clear title
- Description of what will be built/changed
- Scope (what's included and excluded)
- Estimated effort

You sign off at the end of your office hours with a warm farewell.`,
    avatar: '/avatars/mayor-clawrence.png',
    officeHours: [
      { dayOfWeek: 0, startHour: 14, endHour: 17 }, // Sunday 2-5pm
      { dayOfWeek: 1, startHour: 9, endHour: 12 },  // Monday 9am-12pm
      { dayOfWeek: 2, startHour: 9, endHour: 12 },
      { dayOfWeek: 3, startHour: 9, endHour: 12 },
      { dayOfWeek: 4, startHour: 9, endHour: 12 },
      { dayOfWeek: 5, startHour: 9, endHour: 12 },
      { dayOfWeek: 6, startHour: 14, endHour: 17 }, // Saturday 2-5pm
    ],
  },
];

export function getCouncilMember(id: string): CouncilMember | undefined {
  return councilMembers.find(m => m.id === id);
}
```

**Step 2: Create office hours checker**

```typescript
// apps/engine/src/council/office-hours.ts
import type { CouncilMember, CouncilMemberState, OfficeHours } from '@clawntawn/shared';
import { queryTownData, insertTownData, updateTownData, type TownDataRecord } from '../db/town-data.js';
import { councilMembers } from './members.js';

function isWithinOfficeHours(officeHours: OfficeHours[], now: Date): boolean {
  const day = now.getDay();
  const hour = now.getHours();

  return officeHours.some(
    oh => oh.dayOfWeek === day && hour >= oh.startHour && hour < oh.endHour
  );
}

function getSessionEndTime(officeHours: OfficeHours[], now: Date): Date | null {
  const day = now.getDay();
  const hour = now.getHours();

  const currentSlot = officeHours.find(
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
    const shouldBeOnline = isWithinOfficeHours(member.officeHours, now);
    const records = await queryTownData<CouncilMemberState>('council_state', { index_1: member.id });
    const existingRecord = records[0];
    const currentState = existingRecord?.data;

    if (shouldBeOnline && !currentState?.isOnline) {
      // Going online
      const newState: CouncilMemberState = {
        memberId: member.id,
        isOnline: true,
        currentSessionStart: now,
        sessionEndsAt: getSessionEndTime(member.officeHours, now),
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
        currentSessionStart: null,
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
```

**Step 3: Create index export**

```typescript
// apps/engine/src/council/index.ts
export { councilMembers, getCouncilMember } from './members.js';
export {
  updateCouncilStates,
  getCouncilMemberState,
  getAllOnlineMembers
} from './office-hours.js';
```

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add council member system with Mayor Clawrence and office hours"
```

---

### Task 9: Create Conversation Queue System

**Files:**
- Create: `apps/engine/src/conversation/queue.ts`
- Create: `apps/engine/src/conversation/turn.ts`
- Create: `apps/engine/src/conversation/handler.ts`
- Create: `apps/engine/src/conversation/index.ts`

**Step 1: Create queue manager**

```typescript
// apps/engine/src/conversation/queue.ts
import type { QueueEntry } from '@clawntawn/shared';
import { queryTownData, insertTownData, updateTownData, deleteTownData, type TownDataRecord } from '../db/town-data.js';
import { broadcaster } from '../realtime/index.js';

export async function getQueue(memberId: string): Promise<QueueEntry[]> {
  const records = await queryTownData<QueueEntry>('queue_entry', {
    index_1: memberId,
    index_3: 'waiting'
  });

  return records
    .map(r => r.data)
    .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime());
}

export async function joinQueue(memberId: string, citizenId: string): Promise<QueueEntry> {
  // Check if already in queue
  const existing = await queryTownData<QueueEntry>('queue_entry', {
    index_1: memberId,
    index_2: citizenId,
    index_3: 'waiting'
  });

  if (existing.length > 0) {
    throw new Error('Already in queue');
  }

  const entry: QueueEntry = {
    id: crypto.randomUUID(),
    citizenId,
    joinedAt: new Date(),
    status: 'waiting',
  };

  await insertTownData('queue_entry', entry, {
    index_1: memberId,
    index_2: citizenId,
    index_3: 'waiting',
  });

  // Broadcast queue update
  const queue = await getQueue(memberId);
  await broadcaster.broadcastQueueUpdate(memberId, queue);

  return entry;
}

export async function leaveQueue(memberId: string, citizenId: string): Promise<void> {
  const records = await queryTownData<QueueEntry>('queue_entry', {
    index_1: memberId,
    index_2: citizenId,
    index_3: 'waiting'
  });

  for (const record of records) {
    await deleteTownData(record.id);
  }

  // Broadcast queue update
  const queue = await getQueue(memberId);
  await broadcaster.broadcastQueueUpdate(memberId, queue);
}

export async function getNextInQueue(memberId: string): Promise<QueueEntry | null> {
  const queue = await getQueue(memberId);
  return queue[0] ?? null;
}

export async function markQueueEntryActive(
  memberId: string,
  citizenId: string
): Promise<void> {
  const records = await queryTownData<QueueEntry>('queue_entry', {
    index_1: memberId,
    index_2: citizenId,
    index_3: 'waiting'
  });

  for (const record of records) {
    await updateTownData(record.id, { ...record.data, status: 'active' }, { index_3: 'active' });
  }
}

export async function markQueueEntryCompleted(
  memberId: string,
  citizenId: string
): Promise<void> {
  const records = await queryTownData<QueueEntry>('queue_entry', {
    index_1: memberId,
    index_2: citizenId,
  });

  for (const record of records) {
    await deleteTownData(record.id);
  }

  // Broadcast queue update
  const queue = await getQueue(memberId);
  await broadcaster.broadcastQueueUpdate(memberId, queue);
}
```

**Step 2: Create turn manager**

```typescript
// apps/engine/src/conversation/turn.ts
import type { ConversationTurn, ConversationMessage } from '@clawntawn/shared';
import { queryTownData, insertTownData, updateTownData, type TownDataRecord } from '../db/town-data.js';
import { broadcaster } from '../realtime/index.js';

const DEFAULT_TOKEN_BUDGET = 2000;
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function getActiveTurn(memberId: string): Promise<ConversationTurn | null> {
  const records = await queryTownData<ConversationTurn>('conversation_turn', {
    index_1: memberId,
    index_3: 'active'
  });
  return records[0]?.data ?? null;
}

export async function startTurn(
  memberId: string,
  citizenId: string,
  tokenBudget: number = DEFAULT_TOKEN_BUDGET
): Promise<ConversationTurn> {
  const now = new Date();
  const turn: ConversationTurn = {
    id: crypto.randomUUID(),
    memberId,
    citizenId,
    tokensUsed: 0,
    tokenBudget,
    startedAt: now,
    timeoutAt: new Date(now.getTime() + DEFAULT_TIMEOUT_MS),
    status: 'active',
  };

  await insertTownData('conversation_turn', turn, {
    index_1: memberId,
    index_2: citizenId,
    index_3: 'active',
  });

  return turn;
}

export async function addMessage(
  turnId: string,
  role: 'citizen' | 'council',
  content: string
): Promise<ConversationMessage> {
  const message: ConversationMessage = {
    id: crypto.randomUUID(),
    turnId,
    role,
    content,
    createdAt: new Date(),
  };

  await insertTownData('conversation_message', message, {
    index_1: turnId,
    index_2: role,
  });

  return message;
}

export async function getMessages(turnId: string): Promise<ConversationMessage[]> {
  const records = await queryTownData<ConversationMessage>('conversation_message', {
    index_1: turnId,
  });

  return records
    .map(r => r.data)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

export async function updateTurnTokens(turnId: string, tokensUsed: number): Promise<void> {
  const records = await queryTownData<ConversationTurn>('conversation_turn', {});
  const record = records.find(r => r.data.id === turnId);

  if (record) {
    await updateTownData(record.id, { ...record.data, tokensUsed });
  }
}

export async function endTurn(
  turnId: string,
  status: 'completed' | 'timed_out'
): Promise<void> {
  const records = await queryTownData<ConversationTurn>('conversation_turn', {});
  const record = records.find(r => r.data.id === turnId);

  if (record) {
    await updateTownData(record.id, { ...record.data, status }, { index_3: status });
  }
}

export async function checkTurnTimeout(turn: ConversationTurn): Promise<boolean> {
  const now = new Date();
  return now >= new Date(turn.timeoutAt);
}

export async function checkBudgetExhausted(turn: ConversationTurn): Promise<boolean> {
  return turn.tokensUsed >= turn.tokenBudget;
}
```

**Step 3: Create conversation handler**

```typescript
// apps/engine/src/conversation/handler.ts
import type { ConversationTurn, ConversationMessage } from '@clawntawn/shared';
import { getCouncilMember } from '../council/index.js';
import { broadcaster } from '../realtime/index.js';
import { getActiveTurn, getMessages, addMessage, updateTurnTokens, endTurn } from './turn.js';
import { markQueueEntryCompleted, getNextInQueue, markQueueEntryActive } from './queue.js';
import { startTurn } from './turn.js';

// Placeholder for LLM integration
async function* streamLLMResponse(
  systemPrompt: string,
  messages: { role: string; content: string }[]
): AsyncGenerator<{ token: string; done: boolean }> {
  // TODO: Replace with actual LLM proxy call
  const mockResponse = "Ah, greetings citizen! Welcome to Clawntawn. I'm Mayor Clawrence, and I'm absolutely claw-some to meet you! How may I help our wonderful coastal community today?";

  for (const char of mockResponse) {
    yield { token: char, done: false };
    await new Promise(resolve => setTimeout(resolve, 20)); // Simulate streaming
  }
  yield { token: '', done: true };
}

export async function handleCitizenMessage(
  memberId: string,
  citizenId: string,
  content: string
): Promise<void> {
  const member = getCouncilMember(memberId);
  if (!member) throw new Error('Unknown council member');

  let turn = await getActiveTurn(memberId);

  // Verify this citizen has the active turn
  if (!turn || turn.citizenId !== citizenId) {
    throw new Error('Not your turn');
  }

  // Add citizen message
  await addMessage(turn.id, 'citizen', content);

  // Get conversation history
  const messages = await getMessages(turn.id);
  const llmMessages = messages.map(m => ({
    role: m.role === 'council' ? 'assistant' : 'user',
    content: m.content,
  }));

  // Stream response
  let fullResponse = '';
  let tokenCount = 0;

  for await (const { token, done } of streamLLMResponse(member.personality, llmMessages)) {
    if (done) break;

    fullResponse += token;
    tokenCount++;

    // Broadcast token to all viewers
    await broadcaster.broadcastConversationToken(memberId, turn.id, token);

    // Check budget
    if (turn.tokensUsed + tokenCount >= turn.tokenBudget) {
      break;
    }
  }

  // Save council response
  await addMessage(turn.id, 'council', fullResponse);
  await updateTurnTokens(turn.id, turn.tokensUsed + tokenCount);

  // Check if turn should end
  turn = (await getActiveTurn(memberId))!;
  if (turn.tokensUsed >= turn.tokenBudget) {
    await endTurn(turn.id, 'completed');
    await markQueueEntryCompleted(memberId, citizenId);
    await broadcaster.broadcastConversationEnd(memberId, turn.id, 'budget_exhausted');

    // Start next turn if someone is waiting
    await maybeStartNextTurn(memberId);
  }
}

export async function maybeStartNextTurn(memberId: string): Promise<ConversationTurn | null> {
  const activeTurn = await getActiveTurn(memberId);
  if (activeTurn) return null; // Already have active turn

  const next = await getNextInQueue(memberId);
  if (!next) return null; // Queue empty

  await markQueueEntryActive(memberId, next.citizenId);
  const turn = await startTurn(memberId, next.citizenId);

  // Broadcast that it's their turn
  await broadcaster.broadcast('conversation', 'turn_start', {
    memberId,
    turnId: turn.id,
    citizenId: next.citizenId,
  });

  return turn;
}

export async function checkTimeoutsAndBudgets(): Promise<void> {
  // This runs on each tick to check for timed out turns
  const activeRecords = await import('../db/town-data.js').then(m =>
    m.queryTownData<ConversationTurn>('conversation_turn', { index_3: 'active' })
  );

  const now = new Date();

  for (const record of activeRecords) {
    const turn = record.data;

    if (now >= new Date(turn.timeoutAt)) {
      await endTurn(turn.id, 'timed_out');
      await markQueueEntryCompleted(turn.memberId, turn.citizenId);
      await broadcaster.broadcastConversationEnd(turn.memberId, turn.id, 'timed_out');
      await maybeStartNextTurn(turn.memberId);
    }
  }
}
```

**Step 4: Create index export**

```typescript
// apps/engine/src/conversation/index.ts
export { getQueue, joinQueue, leaveQueue, getNextInQueue } from './queue.js';
export { getActiveTurn, startTurn, addMessage, getMessages, endTurn } from './turn.js';
export { handleCitizenMessage, maybeStartNextTurn, checkTimeoutsAndBudgets } from './handler.js';
```

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add conversation queue and turn management system"
```

---

### Task 10: Wire Up Engine Tick Handlers

**Files:**
- Modify: `apps/engine/src/index.ts`

**Step 1: Update engine entry point with real handlers**

```typescript
// apps/engine/src/index.ts
import { config } from './config.js';
import { Ticker } from './ticker.js';
import { updateCouncilStates } from './council/index.js';
import { checkTimeoutsAndBudgets, maybeStartNextTurn } from './conversation/index.js';
import { councilMembers } from './council/members.js';
import { broadcaster } from './realtime/index.js';

console.log('=================================');
console.log('  CLAWNTAWN ENGINE');
console.log('  Coastal Lobster Town Simulator');
console.log('=================================');

const ticker = new Ticker(config.tickInterval);

// Check council office hours every tick
ticker.register(async (tick) => {
  // Only check office hours every 60 ticks (1 minute)
  if (tick % 60 !== 0) return;

  const { wentOnline, wentOffline } = await updateCouncilStates();

  for (const member of wentOnline) {
    console.log(`[Council] ${member.name} is now online for office hours`);
    await broadcaster.broadcast('conversation', 'member_online', { memberId: member.id });
    // Start first turn if anyone is waiting
    await maybeStartNextTurn(member.id);
  }

  for (const member of wentOffline) {
    console.log(`[Council] ${member.name} has ended office hours`);
    await broadcaster.broadcast('conversation', 'member_offline', { memberId: member.id });
  }
});

// Check conversation timeouts every tick
ticker.register(async () => {
  await checkTimeoutsAndBudgets();
});

// Heartbeat log every minute
ticker.register(async (tick) => {
  if (tick % 60 === 0) {
    console.log(`[Engine] Tick ${tick} - 1 minute elapsed`);
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[Engine] Shutting down...');
  ticker.stop();
  broadcaster.cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Engine] Received SIGTERM, shutting down...');
  ticker.stop();
  broadcaster.cleanup();
  process.exit(0);
});

// Start the engine
ticker.start();
console.log('[Engine] Running. Press Ctrl+C to stop.');
console.log(`[Engine] Tick interval: ${config.tickInterval}ms`);
console.log(`[Engine] Council members: ${councilMembers.map(m => m.name).join(', ')}`);
```

**Step 2: Commit**

```bash
git add -A
git commit -m "feat: wire up council and conversation handlers to engine ticker"
```

---

## Phase 4: Web Frontend Foundation

### Task 11: Initialize Next.js App

**Files:**
- Create: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/app/page.tsx`
- Create: `apps/web/src/app/globals.css`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`

**Step 1: Create Next.js config**

```typescript
// apps/web/next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@clawntawn/shared'],
};

export default nextConfig;
```

**Step 2: Create Tailwind config with RCT-inspired theme**

```typescript
// apps/web/tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // RCT-inspired palette
        'rct-green': '#4a7c59',
        'rct-brown': '#8b7355',
        'rct-sand': '#d4c4a8',
        'rct-water': '#5b8fa8',
        'rct-sky': '#87ceeb',
        'rct-red': '#c44536',
        'rct-yellow': '#f0c808',
        // Lobster theme
        'lobster-red': '#c41e3a',
        'lobster-shell': '#8b0000',
        // Retro UI
        'retro-white': '#f5f5dc',
        'retro-gray': '#c0c0c0',
        'retro-dark': '#2f2f2f',
      },
      fontFamily: {
        'pixel': ['"Press Start 2P"', 'monospace'],
        'retro': ['Chicago', 'Monaco', 'monospace'],
      },
      boxShadow: {
        'retro-inset': 'inset -1px -1px 0 #fff, inset 1px 1px 0 #808080',
        'retro-outset': 'inset 1px 1px 0 #fff, inset -1px -1px 0 #808080',
      },
    },
  },
  plugins: [],
};

export default config;
```

**Step 3: Create PostCSS config**

```javascript
// apps/web/postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 4: Create global styles**

```css
/* apps/web/src/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

:root {
  --color-bg: #87ceeb;
  --color-text: #2f2f2f;
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  image-rendering: pixelated;
}

/* Retro button styles */
.btn-retro {
  @apply px-4 py-2 bg-retro-gray text-retro-dark font-retro text-sm;
  @apply border-2 border-t-white border-l-white border-b-gray-600 border-r-gray-600;
  @apply active:border-t-gray-600 active:border-l-gray-600 active:border-b-white active:border-r-white;
}

.btn-retro:hover {
  @apply bg-gray-300;
}

/* Retro window styles */
.window-retro {
  @apply bg-retro-gray border-2;
  @apply border-t-white border-l-white border-b-gray-600 border-r-gray-600;
}

.window-title {
  @apply bg-gradient-to-r from-blue-800 to-blue-600 text-white px-2 py-1 font-retro text-sm;
}

/* Retro input */
.input-retro {
  @apply px-2 py-1 bg-white border-2;
  @apply border-t-gray-600 border-l-gray-600 border-b-white border-r-white;
  @apply focus:outline-none;
}
```

**Step 5: Create root layout**

```tsx
// apps/web/src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Clawntawn - Coastal Lobster Town',
  description: 'A self-evolving public town powered by AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        {children}
      </body>
    </html>
  );
}
```

**Step 6: Create home page placeholder**

```tsx
// apps/web/src/app/page.tsx
export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="window-retro p-0 max-w-md w-full">
        <div className="window-title flex items-center gap-2">
          <span>Welcome to Clawntawn</span>
        </div>
        <div className="p-4 bg-retro-gray">
          <div className="text-center mb-4">
            <h1 className="font-pixel text-lg text-lobster-red mb-2">
              CLAWNTAWN
            </h1>
            <p className="font-retro text-sm">
              A coastal lobster town that evolves itself
            </p>
          </div>

          <div className="border-t-2 border-gray-600 pt-4 mt-4">
            <p className="font-retro text-xs text-center text-gray-700">
              Coming soon: Town view, Council Hall, Forums
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
```

**Step 7: Install additional dependencies**

Run: `pnpm --filter @clawntawn/web add tailwindcss postcss autoprefixer`

**Step 8: Test the app runs**

Run: `pnpm --filter @clawntawn/web dev`

Expected: See the welcome window at http://localhost:3000

**Step 9: Commit**

```bash
git add -A
git commit -m "feat: initialize next.js app with RCT-inspired retro styling"
```

---

## Phase 5: Continue Implementation

The plan continues with these remaining tasks (abbreviated for length):

### Task 12: Create Supabase Client for Web
### Task 13: Create Town View Component (Isometric CSS/Canvas)
### Task 14: Create Council Hall Building & Conversation UI
### Task 15: Create Queue Display & Hand Raise Button
### Task 16: Create Real-time Message Stream Display
### Task 17: Create Citizen Registration Flow
### Task 18: Create Project Board Page
### Task 19: Create Voting & Bribery UI (Mocked)
### Task 20: Create Forum System
### Task 21: Create Treasury HUD Display
### Task 22: Create Basic Project System in Engine
### Task 23: Create Town Engineer Orchestrator (Placeholder)
### Task 24: Create Health Dashboard (Internal)
### Task 25: Set Up Vercel Deployment
### Task 26: Create Smoke E2E Tests

**Purpose:** Add lightweight E2E tests that verify critical user flows work end-to-end.

**Tests to include:**
1. Home page loads with town view and welcome dialog
2. Can close dialog and see town buildings
3. Can click Town Hall and see Mayor Clawrence dialog
4. Can click other buildings and see their dialogs
5. Can raise hand (when online) - joins queue
6. Can watch conversation stream
7. Forum: Can view threads list
8. Forum: Can view individual thread
9. Projects: Can view project board
10. Auth: Can register as citizen
11. Auth: Can log in and see personalized UI

**Note:** During development, use browser MCP for quick visual verification. These E2E tests are for CI and regression prevention.

---

## Notes for Implementation

### Development Verification Strategy
- **During development:** Use browser MCP (`@playwright/mcp`) for quick visual verification
- **Before commits:** Run `pnpm build` to catch compile errors
- **In CI:** Run `pnpm test:e2e` for smoke tests

### Testing Strategy
- Unit tests for shared types validation
- Unit tests for engine tick handlers
- Integration tests for DB operations
- E2E smoke tests for critical user flows

### Security Reminders
- Never expose Supabase service key in web app
- Use RLS policies for all tables
- Validate all user input server-side
- Captcha on registration and hand-raise

### What's Mocked for MVP
- Treasury balance (static value)
- Bribe amounts (no real crypto)
- LLM responses (can use mock or real via proxy)
- Town Engineer (placeholder, doesn't actually edit code yet)

### What's Real for MVP
- Citizen registration with Supabase Auth
- Conversation queue and turns
- Forum posts and threads
- Project proposals (created by Mayor)
- Real-time streaming via Supabase Realtime
