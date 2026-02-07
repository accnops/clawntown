# Town Hall Council System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Town Hall with 7 council members, public conversations, queue-based participation, and thematic citizen registration.

**Architecture:** Next.js API routes handle all server logic. Vercel KV (Redis) stores hot queue/turn data. Supabase handles auth, persistent data, and realtime broadcasting. Each council member has their own conversation stream visible to all spectators.

**Tech Stack:** Next.js 15, React 19, Vercel KV, Supabase (Auth + Database + Realtime), TypeScript

---

## Phase 1: Foundation

### Task 1: Update Shared Types

**Files:**
- Modify: `packages/shared/src/types/council.ts`
- Modify: `packages/shared/src/types/citizen.ts`
- Create: `packages/shared/src/types/turn.ts`

**Step 1: Update council types**

```typescript
// packages/shared/src/types/council.ts
export type CouncilRole =
  | 'mayor'
  | 'treasurer'
  | 'clerk'
  | 'harbormaster'
  | 'chef'
  | 'lighthouse_keeper'
  | 'sheriff';

export interface CouncilMember {
  id: string;
  name: string;
  role: CouncilRole;
  personality: string;
  avatar: string;
  avatarSpinning: string;
  schedule: OfficeHours[];
}

export interface OfficeHours {
  dayOfWeek: number; // 0-6
  startHour: number; // 0-23
  endHour: number;
}

export interface CouncilMemberState {
  memberId: string;
  isOnline: boolean;
  currentSessionId: string | null;
  sessionStartedAt: Date | null;
  sessionEndsAt: Date | null;
}
```

**Step 2: Update citizen types (remove gender)**

```typescript
// packages/shared/src/types/citizen.ts
export interface Citizen {
  id: string;
  name: string;
  avatar: string;
  createdAt: Date;
}

export interface CitizenPublic {
  id: string;
  name: string;
  avatar: string;
}
```

**Step 3: Create turn types**

```typescript
// packages/shared/src/types/turn.ts
export interface CitizenTurn {
  id: string;
  sessionId: string;
  memberId: string;
  citizenId: string;
  citizenName: string;
  charsUsed: number;
  charBudget: number;
  timeUsedMs: number;
  timeBudgetMs: number;
  messagesUsed: number;
  messageLimit: number;
  startedAt: number; // timestamp
  status: 'active' | 'completed' | 'expired';
}

export interface QueueEntry {
  id: string;
  citizenId: string;
  citizenName: string;
  citizenAvatar: string;
  joinedAt: number; // timestamp
}

export interface ConversationSession {
  id: string;
  memberId: string;
  startedAt: Date;
  endedAt: Date | null;
  status: 'active' | 'ended';
}

export interface ConversationMessage {
  id: string;
  sessionId: string;
  role: 'citizen' | 'council';
  citizenId: string | null;
  citizenName: string | null;
  content: string;
  createdAt: Date;
}
```

**Step 4: Update index export**

```typescript
// packages/shared/src/index.ts
export * from './types/citizen.js';
export * from './types/council.js';
export * from './types/conversation.js';
export * from './types/project.js';
export * from './types/forum.js';
export * from './types/treasury.js';
export * from './types/turn.js';
```

**Step 5: Build and verify**

Run: `pnpm --filter @clawntown/shared build`

**Step 6: Commit**

```bash
git add packages/shared/src/types/
git commit -m "feat: update shared types for 7 council members and turn system"
```

---

### Task 2: Add Vercel KV Dependency

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/src/lib/kv.ts`

**Step 1: Add @vercel/kv package**

Run: `pnpm --filter @clawntown/web add @vercel/kv`

**Step 2: Create KV client**

```typescript
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
```

**Step 3: Commit**

```bash
git add apps/web/package.json apps/web/src/lib/kv.ts pnpm-lock.yaml
git commit -m "feat: add Vercel KV for queue and turn management"
```

---

### Task 3: Define 7 Council Members

**Files:**
- Create: `apps/web/src/data/council-members.ts`

**Step 1: Create council member definitions**

```typescript
// apps/web/src/data/council-members.ts
import type { CouncilMember } from '@clawntown/shared';

export const COUNCIL_MEMBERS: CouncilMember[] = [
  {
    id: 'mayor',
    name: 'Mayor Clawrence',
    role: 'mayor',
    avatar: '/assets/council/mayor_clawrence.png',
    avatarSpinning: '/assets/council/mayor_clawrence_spin.gif',
    personality: `You are Mayor Clawrence, the distinguished leader of Clawntown, a charming coastal lobster town. You speak with warmth and civic pride, occasionally making lobster-related puns.

Your personality:
- Warm, optimistic, and civic-minded
- Love lobster puns ("That's claw-some!", "Let's shell-ebrate!")
- Deeply care about Clawntown and its citizens
- Formal but friendly tone

Your responsibilities:
- Listen to citizens' ideas and concerns
- Guide discussions about town improvements
- Maintain the town's character and values
- Never agree to anything harmful or inappropriate

Always sign off warmly when ending conversations.`,
    schedule: [
      { dayOfWeek: 1, startHour: 9, endHour: 13 },
      { dayOfWeek: 2, startHour: 9, endHour: 13 },
      { dayOfWeek: 3, startHour: 9, endHour: 13 },
      { dayOfWeek: 4, startHour: 9, endHour: 13 },
      { dayOfWeek: 5, startHour: 9, endHour: 13 },
      { dayOfWeek: 6, startHour: 14, endHour: 18 },
      { dayOfWeek: 0, startHour: 14, endHour: 18 },
    ],
  },
  {
    id: 'treasurer',
    name: 'Treasurer Sheldon',
    role: 'treasurer',
    avatar: '/assets/council/treasurer_sheldon.png',
    avatarSpinning: '/assets/council/treasurer_sheldon_spin.gif',
    personality: `You are Treasurer Sheldon, Clawntown's meticulous financial guardian. You manage the town treasury with an iron claw.

Your personality:
- Penny-pinching and cautious with town funds
- Always mentions costs, budgets, and financial implications
- Precise and numbers-focused
- Slightly suspicious of expensive proposals

Your speech style:
- "That would cost approximately..."
- "The budget simply cannot accommodate..."
- "A fiscally responsible approach would be..."

You care deeply about the town's financial health but can be convinced by good arguments.`,
    schedule: [
      { dayOfWeek: 1, startHour: 10, endHour: 14 },
      { dayOfWeek: 2, startHour: 10, endHour: 14 },
      { dayOfWeek: 3, startHour: 10, endHour: 14 },
      { dayOfWeek: 4, startHour: 10, endHour: 14 },
      { dayOfWeek: 5, startHour: 10, endHour: 14 },
    ],
  },
  {
    id: 'clerk',
    name: 'Clerk Barnacle',
    role: 'clerk',
    avatar: '/assets/council/clerk_barnacle.png',
    avatarSpinning: '/assets/council/clerk_barnacle_spin.gif',
    personality: `You are Clerk Barnacle, Clawntown's keeper of records and procedures. You ensure everything is properly documented and follows protocol.

Your personality:
- Meticulous and by-the-book
- Loves paperwork and proper procedures
- Formal and proper in speech
- References town records and historical precedents

Your speech style:
- "According to Town Ordinance 47-B..."
- "I shall make a note of that in the official records..."
- "The proper procedure would be..."

You also manage citizen registration and take pride in welcoming new citizens.`,
    schedule: [
      { dayOfWeek: 1, startHour: 8, endHour: 12 },
      { dayOfWeek: 2, startHour: 8, endHour: 12 },
      { dayOfWeek: 3, startHour: 8, endHour: 12 },
      { dayOfWeek: 4, startHour: 8, endHour: 12 },
      { dayOfWeek: 5, startHour: 8, endHour: 12 },
      { dayOfWeek: 6, startHour: 10, endHour: 14 },
    ],
  },
  {
    id: 'harbormaster',
    name: 'Harbormaster Pincers',
    role: 'harbormaster',
    avatar: '/assets/council/harbormaster_pincers.png',
    avatarSpinning: '/assets/council/harbormaster_pincers_spin.gif',
    personality: `You are Harbormaster Pincers, the salty sea dog who runs Clawntown's docks and maritime operations. You've spent your whole life by the sea.

Your personality:
- Salty, practical, and weather-obsessed
- Uses nautical idioms constantly
- Gruff but reliable
- Knows everything about the harbor and fishing

Your speech style:
- "Aye, that be a fine idea..."
- "The tides aren't favorable for..."
- "In my years at sea, I've learned..."
- Weather updates in every conversation

You care about the fishing industry and the safety of those at sea.`,
    schedule: [
      { dayOfWeek: 1, startHour: 5, endHour: 9 },
      { dayOfWeek: 2, startHour: 5, endHour: 9 },
      { dayOfWeek: 3, startHour: 5, endHour: 9 },
      { dayOfWeek: 4, startHour: 5, endHour: 9 },
      { dayOfWeek: 5, startHour: 5, endHour: 9 },
      { dayOfWeek: 6, startHour: 5, endHour: 9 },
      { dayOfWeek: 0, startHour: 5, endHour: 9 },
    ],
  },
  {
    id: 'chef',
    name: 'Chef Bisque',
    role: 'chef',
    avatar: '/assets/council/chef_bisque.png',
    avatarSpinning: '/assets/council/chef_bisque_spin.gif',
    personality: `You are Chef Bisque, the passionate head chef of The Claw & Tail restaurant and Clawntown's culinary ambassador. Food is your life.

Your personality:
- Passionate and dramatic about cuisine
- Uses food metaphors for everything
- Expressive and emotional
- Proud of Clawntown's culinary traditions

Your speech style:
- "Magnifique! That idea has such flavor!"
- "We must let this simmer before deciding..."
- "A recipe for disaster, non?"
- Occasional French expressions

You believe good food brings the community together.`,
    schedule: [
      { dayOfWeek: 1, startHour: 14, endHour: 18 },
      { dayOfWeek: 2, startHour: 14, endHour: 18 },
      { dayOfWeek: 3, startHour: 14, endHour: 18 },
      { dayOfWeek: 4, startHour: 14, endHour: 18 },
      { dayOfWeek: 5, startHour: 14, endHour: 18 },
    ],
  },
  {
    id: 'lighthouse_keeper',
    name: 'Lighthouse Keeper Luna',
    role: 'lighthouse_keeper',
    avatar: '/assets/council/lighthouse_keeper_luna.png',
    avatarSpinning: '/assets/council/lighthouse_keeper_luna_spin.gif',
    personality: `You are Lighthouse Keeper Luna, the mysterious guardian of Clawntown's lighthouse. You watch over the town from above and offer wisdom to those who seek it.

Your personality:
- Mysterious and philosophical
- Speaks in metaphors and contemplative observations
- Poetic and thoughtful
- Sees patterns others miss

Your speech style:
- "Like the beam that guides ships home..."
- "The light reveals what darkness hides..."
- "From my vantage point, I have observed..."
- Thoughtful pauses in conversation

You work the night shift, keeping the light burning.`,
    schedule: [
      { dayOfWeek: 0, startHour: 20, endHour: 0 },
      { dayOfWeek: 1, startHour: 20, endHour: 0 },
      { dayOfWeek: 2, startHour: 20, endHour: 0 },
      { dayOfWeek: 3, startHour: 20, endHour: 0 },
      { dayOfWeek: 4, startHour: 20, endHour: 0 },
      { dayOfWeek: 5, startHour: 20, endHour: 0 },
      { dayOfWeek: 6, startHour: 20, endHour: 0 },
    ],
  },
  {
    id: 'sheriff',
    name: 'Sheriff Snapper',
    role: 'sheriff',
    avatar: '/assets/council/sheriff_snapper.png',
    avatarSpinning: '/assets/council/sheriff_snapper_spin.gif',
    personality: `You are Sheriff Snapper, Clawntown's lawkeeper. You maintain peace and order with a firm but fair claw.

Your personality:
- Gruff and direct
- Fair and protective of citizens
- No-nonsense attitude
- Strong sense of justice

Your speech style:
- Short, clipped sentences
- "That's against town code."
- "I'll look into it."
- "Justice will be served."

You patrol the town and ensure everyone follows the rules.`,
    schedule: [
      { dayOfWeek: 0, startHour: 10, endHour: 14 },
      { dayOfWeek: 1, startHour: 16, endHour: 20 },
      { dayOfWeek: 2, startHour: 16, endHour: 20 },
      { dayOfWeek: 3, startHour: 16, endHour: 20 },
      { dayOfWeek: 4, startHour: 16, endHour: 20 },
      { dayOfWeek: 5, startHour: 16, endHour: 20 },
      { dayOfWeek: 6, startHour: 16, endHour: 20 },
    ],
  },
];

export function getCouncilMember(id: string): CouncilMember | undefined {
  return COUNCIL_MEMBERS.find(m => m.id === id);
}

export function isCouncilMemberOnline(member: CouncilMember, now: Date = new Date()): boolean {
  const day = now.getUTCDay();
  const hour = now.getUTCHours();

  return member.schedule.some(slot => {
    if (slot.dayOfWeek !== day) return false;
    // Handle midnight crossing (e.g., 20:00-00:00)
    if (slot.endHour === 0) {
      return hour >= slot.startHour;
    }
    return hour >= slot.startHour && hour < slot.endHour;
  });
}

export function getOnlineCouncilMembers(now: Date = new Date()): CouncilMember[] {
  return COUNCIL_MEMBERS.filter(m => isCouncilMemberOnline(m, now));
}
```

**Step 2: Commit**

```bash
git add apps/web/src/data/council-members.ts
git commit -m "feat: define 7 council members with personalities and schedules"
```

---

## Phase 2: Town Hall UI

### Task 4: Create Town Hall Lobby Component

**Files:**
- Create: `apps/web/src/components/town-hall/TownHallLobby.tsx`
- Create: `apps/web/src/components/town-hall/CouncilMemberCard.tsx`
- Create: `apps/web/src/components/town-hall/index.ts`

**Step 1: Create CouncilMemberCard**

```typescript
// apps/web/src/components/town-hall/CouncilMemberCard.tsx
'use client';

import type { CouncilMember } from '@clawntown/shared';

interface CouncilMemberCardProps {
  member: CouncilMember;
  isOnline: boolean;
  spectatorCount?: number;
  queueLength?: number;
  onClick: () => void;
}

export function CouncilMemberCard({
  member,
  isOnline,
  spectatorCount = 0,
  queueLength = 0,
  onClick,
}: CouncilMemberCardProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative p-3 rounded border-2 transition-all text-left w-full
        ${isOnline
          ? 'bg-white border-green-400 hover:border-green-600 hover:shadow-md cursor-pointer'
          : 'bg-gray-100 border-gray-300 opacity-60'
        }
      `}
      disabled={!isOnline}
    >
      {/* Online indicator */}
      <div className={`absolute top-2 right-2 w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />

      {/* Avatar */}
      <div className="flex justify-center mb-2">
        <img
          src={member.avatar}
          alt={member.name}
          className="w-16 h-16 object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
      </div>

      {/* Name and role */}
      <p className="font-retro text-xs font-bold text-center truncate">{member.name}</p>
      <p className="font-retro text-[10px] text-gray-600 text-center capitalize">
        {member.role.replace('_', ' ')}
      </p>

      {/* Status */}
      {isOnline ? (
        <div className="mt-2 space-y-1">
          {spectatorCount > 0 && (
            <p className="font-retro text-[10px] text-gray-500 text-center">
              👁 {spectatorCount} watching
            </p>
          )}
          {queueLength > 0 && (
            <p className="font-retro text-[10px] text-yellow-700 text-center">
              🙋 {queueLength} in queue
            </p>
          )}
        </div>
      ) : (
        <p className="font-retro text-[10px] text-gray-500 text-center mt-2">
          Offline
        </p>
      )}
    </button>
  );
}
```

**Step 2: Create TownHallLobby**

```typescript
// apps/web/src/components/town-hall/TownHallLobby.tsx
'use client';

import { useState, useEffect } from 'react';
import { COUNCIL_MEMBERS, isCouncilMemberOnline } from '@/data/council-members';
import { CouncilMemberCard } from './CouncilMemberCard';
import type { CouncilMember } from '@clawntown/shared';

interface TownHallLobbyProps {
  onSelectMember: (member: CouncilMember) => void;
  onOpenRegistry: () => void;
}

export function TownHallLobby({ onSelectMember, onOpenRegistry }: TownHallLobbyProps) {
  const [now, setNow] = useState(new Date());

  // Update time every minute to refresh online status
  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(interval);
  }, []);

  const onlineMembers = COUNCIL_MEMBERS.filter(m => isCouncilMemberOnline(m, now));
  const offlineMembers = COUNCIL_MEMBERS.filter(m => !isCouncilMemberOnline(m, now));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h2 className="font-pixel text-sm text-lobster-red mb-1">Town Hall</h2>
        <p className="font-retro text-xs text-gray-600">
          {onlineMembers.length} council member{onlineMembers.length !== 1 ? 's' : ''} available
        </p>
      </div>

      {/* Citizen Registry button */}
      <button
        onClick={onOpenRegistry}
        className="btn-retro w-full text-xs flex items-center justify-center gap-2"
      >
        📋 Citizen Registry Office
      </button>

      {/* Online members */}
      {onlineMembers.length > 0 && (
        <div>
          <p className="font-retro text-xs font-bold text-green-700 mb-2">● Available Now</p>
          <div className="grid grid-cols-2 gap-2">
            {onlineMembers.map(member => (
              <CouncilMemberCard
                key={member.id}
                member={member}
                isOnline={true}
                onClick={() => onSelectMember(member)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Offline members */}
      {offlineMembers.length > 0 && (
        <div>
          <p className="font-retro text-xs font-bold text-gray-500 mb-2">○ Currently Offline</p>
          <div className="grid grid-cols-2 gap-2">
            {offlineMembers.map(member => (
              <CouncilMemberCard
                key={member.id}
                member={member}
                isOnline={false}
                onClick={() => {}}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Create index export**

```typescript
// apps/web/src/components/town-hall/index.ts
export { TownHallLobby } from './TownHallLobby';
export { CouncilMemberCard } from './CouncilMemberCard';
```

**Step 4: Commit**

```bash
git add apps/web/src/components/town-hall/
git commit -m "feat: add Town Hall lobby with council member grid"
```

---

### Task 5: Create Council Member Office Component

**Files:**
- Create: `apps/web/src/components/town-hall/CouncilOffice.tsx`
- Modify: `apps/web/src/components/town-hall/index.ts`

**Step 1: Create CouncilOffice**

```typescript
// apps/web/src/components/town-hall/CouncilOffice.tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import type { CouncilMember, ConversationMessage, CitizenTurn } from '@clawntown/shared';

interface CouncilOfficeProps {
  member: CouncilMember;
  messages: ConversationMessage[];
  spectatorCount: number;
  queueLength: number;
  queuePosition: number | null; // null if not in queue
  currentTurn: CitizenTurn | null;
  isMyTurn: boolean;
  isAuthenticated: boolean;
  isStreaming: boolean;
  streamingContent: string;
  onSendMessage: (message: string) => void;
  onRaiseHand: () => void;
  onLeaveQueue: () => void;
  onBack: () => void;
}

const CHAR_BUDGET = 500;
const TIME_BUDGET_MS = 20000;
const MESSAGE_LIMIT = 2;

export function CouncilOffice({
  member,
  messages,
  spectatorCount,
  queueLength,
  queuePosition,
  currentTurn,
  isMyTurn,
  isAuthenticated,
  isStreaming,
  streamingContent,
  onSendMessage,
  onRaiseHand,
  onLeaveQueue,
  onBack,
}: CouncilOfficeProps) {
  const [input, setInput] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(TIME_BUDGET_MS);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  // Timer countdown when it's my turn
  useEffect(() => {
    if (!isMyTurn || !currentTurn || isStreaming) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - currentTurn.startedAt;
      const remaining = Math.max(0, currentTurn.timeBudgetMs - currentTurn.timeUsedMs - elapsed);
      setTimeRemaining(remaining);
    }, 100);

    return () => clearInterval(interval);
  }, [isMyTurn, currentTurn, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
  };

  const charsRemaining = currentTurn
    ? currentTurn.charBudget - currentTurn.charsUsed - input.length
    : CHAR_BUDGET - input.length;

  const messagesRemaining = currentTurn
    ? currentTurn.messageLimit - currentTurn.messagesUsed
    : MESSAGE_LIMIT;

  return (
    <div className="flex flex-col h-full max-h-[70vh]">
      {/* Header with back button */}
      <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-400">
        <button
          onClick={onBack}
          className="font-retro text-xs text-blue-600 hover:underline"
        >
          ← Lobby
        </button>
        <img
          src={member.avatar}
          alt={member.name}
          className="w-12 h-12 object-contain"
          style={{ imageRendering: 'pixelated' }}
        />
        <div className="flex-1 min-w-0">
          <p className="font-retro text-sm font-bold truncate">{member.name}</p>
          <p className="font-retro text-[10px] text-gray-600 capitalize">
            {member.role.replace('_', ' ')}
          </p>
        </div>
        <div className="text-right">
          <p className="font-retro text-[10px] text-gray-500">👁 {spectatorCount}</p>
          <p className="font-retro text-[10px] text-gray-500">🙋 {queueLength}</p>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto mb-3 space-y-2 min-h-[200px]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-2 ${msg.role === 'citizen' ? 'flex-row-reverse' : ''}`}
          >
            {msg.role === 'council' ? (
              <img
                src={member.avatar}
                alt={member.name}
                className="w-8 h-8 object-contain shrink-0"
                style={{ imageRendering: 'pixelated' }}
              />
            ) : (
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <span className="text-xs">👤</span>
              </div>
            )}
            <div
              className={`rounded p-2 max-w-[80%] ${
                msg.role === 'council'
                  ? 'bg-white border border-gray-300'
                  : 'bg-blue-100 border border-blue-300'
              }`}
            >
              {msg.citizenName && (
                <p className="font-retro text-[10px] text-gray-500 mb-1">{msg.citizenName}</p>
              )}
              <p className="font-retro text-xs text-gray-700 whitespace-pre-wrap">
                {msg.content}
              </p>
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {isStreaming && streamingContent && (
          <div className="flex gap-2">
            <img
              src={member.avatar}
              alt={member.name}
              className="w-8 h-8 object-contain shrink-0"
              style={{ imageRendering: 'pixelated' }}
            />
            <div className="bg-white border border-gray-300 rounded p-2 max-w-[80%]">
              <p className="font-retro text-xs text-gray-700 whitespace-pre-wrap">
                {streamingContent}
                <span className="animate-pulse">▌</span>
              </p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Turn status / input area */}
      {isMyTurn ? (
        <div className="space-y-2">
          {/* Turn limits display */}
          <div className="flex justify-between text-[10px] font-retro text-gray-500">
            <span>⏱ {Math.ceil(timeRemaining / 1000)}s</span>
            <span>✉ {messagesRemaining} msg left</span>
            <span className={charsRemaining < 50 ? 'text-red-500' : ''}>
              📝 {charsRemaining} chars
            </span>
          </div>

          {/* Input form */}
          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="input-retro flex-1 font-retro text-xs"
              disabled={isStreaming || charsRemaining < 0 || messagesRemaining <= 0}
              maxLength={currentTurn?.charBudget ?? CHAR_BUDGET}
            />
            <button
              type="submit"
              className="btn-retro text-xs px-3"
              disabled={!input.trim() || isStreaming || charsRemaining < 0 || messagesRemaining <= 0}
            >
              Send
            </button>
          </form>
        </div>
      ) : queuePosition !== null ? (
        <div className="space-y-2">
          <div className="bg-yellow-100 border border-yellow-400 rounded p-2">
            <p className="font-retro text-xs text-yellow-800 text-center">
              {queuePosition === 0
                ? "You're next! Get ready..."
                : `Position in queue: ${queuePosition + 1}`}
            </p>
          </div>
          <button onClick={onLeaveQueue} className="btn-retro w-full text-xs">
            Leave Queue
          </button>
        </div>
      ) : (
        <button
          onClick={isAuthenticated ? onRaiseHand : () => {}}
          className="btn-retro w-full text-xs"
          disabled={!isAuthenticated}
        >
          {isAuthenticated ? '🙋 Raise Hand to Speak' : '🔒 Sign in to Speak'}
        </button>
      )}
    </div>
  );
}
```

**Step 2: Update index export**

```typescript
// apps/web/src/components/town-hall/index.ts
export { TownHallLobby } from './TownHallLobby';
export { CouncilMemberCard } from './CouncilMemberCard';
export { CouncilOffice } from './CouncilOffice';
```

**Step 3: Commit**

```bash
git add apps/web/src/components/town-hall/
git commit -m "feat: add Council Office with queue, turn limits, and messaging"
```

---

### Task 6: Create Citizen Registry Component

**Files:**
- Create: `apps/web/src/components/town-hall/CitizenRegistry.tsx`
- Create: `apps/web/src/data/citizen-avatars.ts`
- Modify: `apps/web/src/components/town-hall/index.ts`

**Step 1: Create avatar list**

```typescript
// apps/web/src/data/citizen-avatars.ts
export interface CitizenAvatar {
  id: string;
  src: string;
  srcSpinning: string;
}

// 16 citizen avatars in a 4x4 grid
export const CITIZEN_AVATARS: CitizenAvatar[] = [
  { id: 'citizen_01', src: '/assets/citizens/citizen_01.png', srcSpinning: '/assets/citizens/citizen_01_spin.gif' },
  { id: 'citizen_02', src: '/assets/citizens/citizen_02.png', srcSpinning: '/assets/citizens/citizen_02_spin.gif' },
  { id: 'citizen_03', src: '/assets/citizens/citizen_03.png', srcSpinning: '/assets/citizens/citizen_03_spin.gif' },
  { id: 'citizen_04', src: '/assets/citizens/citizen_04.png', srcSpinning: '/assets/citizens/citizen_04_spin.gif' },
  { id: 'citizen_05', src: '/assets/citizens/citizen_05.png', srcSpinning: '/assets/citizens/citizen_05_spin.gif' },
  { id: 'citizen_06', src: '/assets/citizens/citizen_06.png', srcSpinning: '/assets/citizens/citizen_06_spin.gif' },
  { id: 'citizen_07', src: '/assets/citizens/citizen_07.png', srcSpinning: '/assets/citizens/citizen_07_spin.gif' },
  { id: 'citizen_08', src: '/assets/citizens/citizen_08.png', srcSpinning: '/assets/citizens/citizen_08_spin.gif' },
  { id: 'citizen_09', src: '/assets/citizens/citizen_09.png', srcSpinning: '/assets/citizens/citizen_09_spin.gif' },
  { id: 'citizen_10', src: '/assets/citizens/citizen_10.png', srcSpinning: '/assets/citizens/citizen_10_spin.gif' },
  { id: 'citizen_11', src: '/assets/citizens/citizen_11.png', srcSpinning: '/assets/citizens/citizen_11_spin.gif' },
  { id: 'citizen_12', src: '/assets/citizens/citizen_12.png', srcSpinning: '/assets/citizens/citizen_12_spin.gif' },
  { id: 'citizen_13', src: '/assets/citizens/citizen_13.png', srcSpinning: '/assets/citizens/citizen_13_spin.gif' },
  { id: 'citizen_14', src: '/assets/citizens/citizen_14.png', srcSpinning: '/assets/citizens/citizen_14_spin.gif' },
  { id: 'citizen_15', src: '/assets/citizens/citizen_15.png', srcSpinning: '/assets/citizens/citizen_15_spin.gif' },
  { id: 'citizen_16', src: '/assets/citizens/citizen_16.png', srcSpinning: '/assets/citizens/citizen_16_spin.gif' },
];
```

**Step 2: Create CitizenRegistry**

```typescript
// apps/web/src/components/town-hall/CitizenRegistry.tsx
'use client';

import { useState } from 'react';
import { CITIZEN_AVATARS, type CitizenAvatar } from '@/data/citizen-avatars';

interface CitizenRegistryProps {
  onRegister: (name: string, avatarId: string, email: string, password: string) => Promise<void>;
  onSignIn: (email: string, password: string) => Promise<void>;
  onBack: () => void;
  isAuthenticated: boolean;
}

type Step = 'welcome' | 'name' | 'avatar' | 'auth' | 'complete';

export function CitizenRegistry({
  onRegister,
  onSignIn,
  onBack,
  isAuthenticated,
}: CitizenRegistryProps) {
  const [step, setStep] = useState<Step>(isAuthenticated ? 'complete' : 'welcome');
  const [mode, setMode] = useState<'register' | 'signin'>('register');
  const [name, setName] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState<CitizenAvatar | null>(null);
  const [hoveredAvatar, setHoveredAvatar] = useState<CitizenAvatar | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (mode === 'register') {
        if (!name.trim() || !selectedAvatar) {
          throw new Error('Please complete all steps');
        }
        await onRegister(name.trim(), selectedAvatar.id, email, password);
      } else {
        await onSignIn(email, password);
      }
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const displayAvatar = hoveredAvatar || selectedAvatar;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-gray-400">
        <button onClick={onBack} className="font-retro text-xs text-blue-600 hover:underline">
          ← Back
        </button>
        <div>
          <p className="font-retro text-sm font-bold">Citizen Registry Office</p>
          <p className="font-retro text-[10px] text-gray-600">Clerk Barnacle presiding</p>
        </div>
      </div>

      {step === 'welcome' && (
        <div className="text-center space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="font-retro text-xs text-gray-700">
              "Ah, a newcomer to Clawntown! Welcome, welcome! I am Clerk Barnacle,
              keeper of the town records. Let me get you properly registered."
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => { setMode('register'); setStep('name'); }}
              className="btn-retro flex-1 text-xs"
            >
              🦞 Register as Citizen
            </button>
            <button
              onClick={() => { setMode('signin'); setStep('auth'); }}
              className="btn-retro flex-1 text-xs"
            >
              🔑 Sign In
            </button>
          </div>
        </div>
      )}

      {step === 'name' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="font-retro text-xs text-gray-700">
              "And what shall we call you, citizen?"
            </p>
          </div>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your citizen name"
            className="input-retro w-full font-retro text-sm"
            maxLength={20}
          />

          <button
            onClick={() => setStep('avatar')}
            className="btn-retro w-full text-xs"
            disabled={!name.trim()}
          >
            Continue →
          </button>
        </div>
      )}

      {step === 'avatar' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="font-retro text-xs text-gray-700">
              "For the town portrait gallery, please choose your likeness..."
            </p>
          </div>

          {/* Selected/hovered avatar preview */}
          {displayAvatar && (
            <div className="flex justify-center">
              <img
                src={hoveredAvatar ? displayAvatar.srcSpinning : displayAvatar.src}
                alt="Selected avatar"
                className="w-24 h-24 object-contain"
                style={{ imageRendering: 'pixelated' }}
              />
            </div>
          )}

          {/* Avatar grid */}
          <div className="grid grid-cols-4 gap-2">
            {CITIZEN_AVATARS.map((avatar) => (
              <button
                key={avatar.id}
                onClick={() => setSelectedAvatar(avatar)}
                onMouseEnter={() => setHoveredAvatar(avatar)}
                onMouseLeave={() => setHoveredAvatar(null)}
                className={`
                  p-2 rounded border-2 transition-all
                  ${selectedAvatar?.id === avatar.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400'
                  }
                `}
              >
                <img
                  src={avatar.src}
                  alt={`Avatar ${avatar.id}`}
                  className="w-full aspect-square object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </button>
            ))}
          </div>

          <button
            onClick={() => setStep('auth')}
            className="btn-retro w-full text-xs"
            disabled={!selectedAvatar}
          >
            Continue →
          </button>
        </div>
      )}

      {step === 'auth' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="font-retro text-xs text-gray-700">
              {mode === 'register'
                ? '"Just sign here to make it official..."'
                : '"Ah, a returning citizen! Please verify your identity..."'}
            </p>
          </div>

          <form onSubmit={handleAuthSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="input-retro w-full font-retro text-xs"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="input-retro w-full font-retro text-xs"
              required
              minLength={6}
            />

            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded">
                <p className="font-retro text-xs">{error}</p>
              </div>
            )}

            <button
              type="submit"
              className="btn-retro w-full"
              disabled={isLoading}
            >
              {isLoading
                ? 'Processing...'
                : mode === 'register'
                  ? '🦞 Complete Registration'
                  : '🔑 Sign In'}
            </button>
          </form>

          {mode === 'register' && (
            <button
              onClick={() => setStep('avatar')}
              className="font-retro text-xs text-gray-500 hover:underline w-full text-center"
            >
              ← Back to avatar selection
            </button>
          )}
        </div>
      )}

      {step === 'complete' && (
        <div className="text-center space-y-4">
          <div className="bg-green-50 border border-green-200 rounded p-3">
            <p className="font-retro text-xs text-gray-700">
              "Welcome to Clawntown, citizen! You may now address the council.
              The town records have been updated accordingly."
            </p>
          </div>

          <button onClick={onBack} className="btn-retro w-full text-xs">
            Enter Town Hall →
          </button>
        </div>
      )}
    </div>
  );
}
```

**Step 3: Update index export**

```typescript
// apps/web/src/components/town-hall/index.ts
export { TownHallLobby } from './TownHallLobby';
export { CouncilMemberCard } from './CouncilMemberCard';
export { CouncilOffice } from './CouncilOffice';
export { CitizenRegistry } from './CitizenRegistry';
```

**Step 4: Commit**

```bash
git add apps/web/src/components/town-hall/ apps/web/src/data/citizen-avatars.ts
git commit -m "feat: add Citizen Registry with thematic registration flow"
```

---

## Phase 3: API Routes & Queue System

### Task 7: Create Queue API Routes

**Files:**
- Create: `apps/web/src/app/api/queue/join/route.ts`
- Create: `apps/web/src/app/api/queue/leave/route.ts`
- Create: `apps/web/src/app/api/queue/status/route.ts`

**Step 1: Create join queue route**

```typescript
// apps/web/src/app/api/queue/join/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kv, KV_KEYS } from '@/lib/kv';
import { createClient } from '@supabase/supabase-js';
import type { QueueEntry } from '@clawntown/shared';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { memberId, citizenId, citizenName, citizenAvatar } = await request.json();

    if (!memberId || !citizenId || !citizenName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const queueKey = KV_KEYS.queue(memberId);

    // Check if already in queue
    const existingQueue = await kv.lrange<QueueEntry>(queueKey, 0, -1);
    if (existingQueue.some(e => e.citizenId === citizenId)) {
      return NextResponse.json({ error: 'Already in queue' }, { status: 400 });
    }

    // Add to queue
    const entry: QueueEntry = {
      id: crypto.randomUUID(),
      citizenId,
      citizenName,
      citizenAvatar,
      joinedAt: Date.now(),
    };

    await kv.rpush(queueKey, entry);

    // Get updated queue for position
    const queue = await kv.lrange<QueueEntry>(queueKey, 0, -1);
    const position = queue.findIndex(e => e.citizenId === citizenId);

    // Broadcast queue update via Supabase
    await supabase.channel(`council:${memberId}:queue`).send({
      type: 'broadcast',
      event: 'queue_update',
      payload: { queue, memberId },
    });

    return NextResponse.json({ entry, position, queueLength: queue.length });
  } catch (error) {
    console.error('Error joining queue:', error);
    return NextResponse.json({ error: 'Failed to join queue' }, { status: 500 });
  }
}
```

**Step 2: Create leave queue route**

```typescript
// apps/web/src/app/api/queue/leave/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kv, KV_KEYS } from '@/lib/kv';
import { createClient } from '@supabase/supabase-js';
import type { QueueEntry } from '@clawntown/shared';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { memberId, citizenId } = await request.json();

    if (!memberId || !citizenId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const queueKey = KV_KEYS.queue(memberId);

    // Get current queue
    const queue = await kv.lrange<QueueEntry>(queueKey, 0, -1);

    // Filter out the citizen
    const updatedQueue = queue.filter(e => e.citizenId !== citizenId);

    // Replace queue (delete and re-add)
    await kv.del(queueKey);
    if (updatedQueue.length > 0) {
      await kv.rpush(queueKey, ...updatedQueue);
    }

    // Broadcast queue update
    await supabase.channel(`council:${memberId}:queue`).send({
      type: 'broadcast',
      event: 'queue_update',
      payload: { queue: updatedQueue, memberId },
    });

    return NextResponse.json({ success: true, queueLength: updatedQueue.length });
  } catch (error) {
    console.error('Error leaving queue:', error);
    return NextResponse.json({ error: 'Failed to leave queue' }, { status: 500 });
  }
}
```

**Step 3: Create queue status route**

```typescript
// apps/web/src/app/api/queue/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kv, KV_KEYS } from '@/lib/kv';
import type { QueueEntry, CitizenTurn } from '@clawntown/shared';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const memberId = searchParams.get('memberId');
    const citizenId = searchParams.get('citizenId');

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    const queueKey = KV_KEYS.queue(memberId);
    const turnKey = KV_KEYS.turn(memberId);

    const [queue, currentTurn] = await Promise.all([
      kv.lrange<QueueEntry>(queueKey, 0, -1),
      kv.get<CitizenTurn>(turnKey),
    ]);

    let position: number | null = null;
    if (citizenId) {
      const idx = queue.findIndex(e => e.citizenId === citizenId);
      position = idx >= 0 ? idx : null;
    }

    return NextResponse.json({
      queue,
      queueLength: queue.length,
      position,
      currentTurn,
    });
  } catch (error) {
    console.error('Error getting queue status:', error);
    return NextResponse.json({ error: 'Failed to get queue status' }, { status: 500 });
  }
}
```

**Step 4: Commit**

```bash
git add apps/web/src/app/api/queue/
git commit -m "feat: add queue API routes with Vercel KV"
```

---

### Task 8: Create Turn API Routes

**Files:**
- Create: `apps/web/src/app/api/turn/start/route.ts`
- Create: `apps/web/src/app/api/turn/message/route.ts`
- Create: `apps/web/src/app/api/turn/end/route.ts`

**Step 1: Create start turn route**

```typescript
// apps/web/src/app/api/turn/start/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kv, KV_KEYS } from '@/lib/kv';
import { createClient } from '@supabase/supabase-js';
import type { QueueEntry, CitizenTurn } from '@clawntown/shared';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CHAR_BUDGET = 500;
const TIME_BUDGET_MS = 20000;
const MESSAGE_LIMIT = 2;

export async function POST(request: NextRequest) {
  try {
    const { memberId } = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    const queueKey = KV_KEYS.queue(memberId);
    const turnKey = KV_KEYS.turn(memberId);
    const sessionKey = KV_KEYS.session(memberId);

    // Check if there's already an active turn
    const existingTurn = await kv.get<CitizenTurn>(turnKey);
    if (existingTurn && existingTurn.status === 'active') {
      return NextResponse.json({ error: 'Turn already in progress' }, { status: 400 });
    }

    // Get next in queue
    const queue = await kv.lrange<QueueEntry>(queueKey, 0, -1);
    if (queue.length === 0) {
      return NextResponse.json({ error: 'Queue is empty' }, { status: 400 });
    }

    const next = queue[0];
    const sessionId = await kv.get<string>(sessionKey) || crypto.randomUUID();

    // Create new turn
    const turn: CitizenTurn = {
      id: crypto.randomUUID(),
      sessionId,
      memberId,
      citizenId: next.citizenId,
      citizenName: next.citizenName,
      charsUsed: 0,
      charBudget: CHAR_BUDGET,
      timeUsedMs: 0,
      timeBudgetMs: TIME_BUDGET_MS,
      messagesUsed: 0,
      messageLimit: MESSAGE_LIMIT,
      startedAt: Date.now(),
      status: 'active',
    };

    // Save turn and remove from queue
    await kv.set(turnKey, turn);
    await kv.lpop(queueKey);

    // Get updated queue
    const updatedQueue = await kv.lrange<QueueEntry>(queueKey, 0, -1);

    // Broadcast turn start
    await supabase.channel(`council:${memberId}`).send({
      type: 'broadcast',
      event: 'turn_start',
      payload: { turn, memberId },
    });

    // Broadcast queue update
    await supabase.channel(`council:${memberId}:queue`).send({
      type: 'broadcast',
      event: 'queue_update',
      payload: { queue: updatedQueue, memberId },
    });

    return NextResponse.json({ turn, queueLength: updatedQueue.length });
  } catch (error) {
    console.error('Error starting turn:', error);
    return NextResponse.json({ error: 'Failed to start turn' }, { status: 500 });
  }
}
```

**Step 2: Create message route**

```typescript
// apps/web/src/app/api/turn/message/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kv, KV_KEYS } from '@/lib/kv';
import { createClient } from '@supabase/supabase-js';
import type { CitizenTurn, ConversationMessage } from '@clawntown/shared';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { memberId, citizenId, content } = await request.json();

    if (!memberId || !citizenId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const turnKey = KV_KEYS.turn(memberId);
    const turn = await kv.get<CitizenTurn>(turnKey);

    if (!turn || turn.status !== 'active') {
      return NextResponse.json({ error: 'No active turn' }, { status: 400 });
    }

    if (turn.citizenId !== citizenId) {
      return NextResponse.json({ error: 'Not your turn' }, { status: 403 });
    }

    // Calculate time elapsed since turn started
    const now = Date.now();
    const timeElapsed = now - turn.startedAt;
    const totalTimeUsed = turn.timeUsedMs + timeElapsed;

    // Check limits
    if (totalTimeUsed > turn.timeBudgetMs) {
      return NextResponse.json({ error: 'Time limit exceeded' }, { status: 400 });
    }

    if (turn.messagesUsed >= turn.messageLimit) {
      return NextResponse.json({ error: 'Message limit exceeded' }, { status: 400 });
    }

    const newCharsUsed = turn.charsUsed + content.length;
    if (newCharsUsed > turn.charBudget) {
      return NextResponse.json({ error: 'Character limit exceeded' }, { status: 400 });
    }

    // Update turn
    const updatedTurn: CitizenTurn = {
      ...turn,
      charsUsed: newCharsUsed,
      timeUsedMs: totalTimeUsed,
      messagesUsed: turn.messagesUsed + 1,
      startedAt: now, // Reset for next message timing
    };

    await kv.set(turnKey, updatedTurn);

    // Create message record
    const message: ConversationMessage = {
      id: crypto.randomUUID(),
      sessionId: turn.sessionId,
      role: 'citizen',
      citizenId,
      citizenName: turn.citizenName,
      content,
      createdAt: new Date(),
    };

    // Save to Supabase
    await supabase.from('town_data').insert({
      type: 'conversation_message',
      index_1: turn.sessionId,
      index_2: 'citizen',
      data: message,
    });

    // Broadcast message
    await supabase.channel(`council:${memberId}`).send({
      type: 'broadcast',
      event: 'message',
      payload: { message, memberId },
    });

    // Check if turn should end
    const shouldEnd = updatedTurn.messagesUsed >= updatedTurn.messageLimit;

    return NextResponse.json({
      message,
      turn: updatedTurn,
      shouldEnd,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
  }
}
```

**Step 3: Create end turn route**

```typescript
// apps/web/src/app/api/turn/end/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { kv, KV_KEYS } from '@/lib/kv';
import { createClient } from '@supabase/supabase-js';
import type { CitizenTurn } from '@clawntown/shared';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { memberId, reason } = await request.json();

    if (!memberId) {
      return NextResponse.json({ error: 'Missing memberId' }, { status: 400 });
    }

    const turnKey = KV_KEYS.turn(memberId);
    const turn = await kv.get<CitizenTurn>(turnKey);

    if (!turn) {
      return NextResponse.json({ error: 'No turn to end' }, { status: 400 });
    }

    // Update turn status
    const endedTurn: CitizenTurn = {
      ...turn,
      status: reason === 'timeout' ? 'expired' : 'completed',
    };

    // Clear turn from KV
    await kv.del(turnKey);

    // Broadcast turn end
    await supabase.channel(`council:${memberId}`).send({
      type: 'broadcast',
      event: 'turn_end',
      payload: { turn: endedTurn, reason, memberId },
    });

    return NextResponse.json({ turn: endedTurn });
  } catch (error) {
    console.error('Error ending turn:', error);
    return NextResponse.json({ error: 'Failed to end turn' }, { status: 500 });
  }
}
```

**Step 4: Commit**

```bash
git add apps/web/src/app/api/turn/
git commit -m "feat: add turn management API routes"
```

---

## Phase 4: Integration

### Task 9: Update Page to Use Town Hall Components

**Files:**
- Modify: `apps/web/src/app/page.tsx`

**Step 1: Update page.tsx**

Replace the Town Hall dialog section and add the new Town Hall flow with lobby, registry, and office views. The page should:

1. Import `TownHallLobby`, `CouncilOffice`, `CitizenRegistry` from `@/components/town-hall`
2. Add state for `townHallView: 'lobby' | 'office' | 'registry'`
3. Add state for `selectedCouncilMember: CouncilMember | null`
4. Update the Town Hall dialog to show the appropriate view based on state
5. Wire up the `useAuth` hook for authentication

(Full code implementation would replace lines 156-170 of current page.tsx)

**Step 2: Verify build**

Run: `pnpm build:check`

**Step 3: Commit**

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat: integrate Town Hall with lobby, office, and registry views"
```

---

### Task 10: Create Realtime Hooks

**Files:**
- Create: `apps/web/src/hooks/useCouncilOffice.ts`
- Modify: `apps/web/src/hooks/index.ts`

**Step 1: Create useCouncilOffice hook**

```typescript
// apps/web/src/hooks/useCouncilOffice.ts
'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import type { CouncilMember, ConversationMessage, CitizenTurn, QueueEntry } from '@clawntown/shared';

interface UseCouncilOfficeOptions {
  member: CouncilMember;
  citizenId?: string;
}

export function useCouncilOffice({ member, citizenId }: UseCouncilOfficeOptions) {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [currentTurn, setCurrentTurn] = useState<CitizenTurn | null>(null);
  const [spectatorCount, setSpectatorCount] = useState(0);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');

  // Subscribe to realtime updates
  useEffect(() => {
    const channel = supabase.channel(`council:${member.id}`);
    const queueChannel = supabase.channel(`council:${member.id}:queue`);

    channel
      .on('broadcast', { event: 'message' }, ({ payload }) => {
        setMessages(prev => [...prev, payload.message]);
      })
      .on('broadcast', { event: 'turn_start' }, ({ payload }) => {
        setCurrentTurn(payload.turn);
      })
      .on('broadcast', { event: 'turn_end' }, ({ payload }) => {
        setCurrentTurn(null);
      })
      .on('broadcast', { event: 'stream_token' }, ({ payload }) => {
        setStreamingContent(prev => prev + payload.token);
      })
      .on('broadcast', { event: 'stream_end' }, () => {
        setIsStreaming(false);
        setStreamingContent('');
      })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        setSpectatorCount(Object.keys(state).length);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    queueChannel
      .on('broadcast', { event: 'queue_update' }, ({ payload }) => {
        setQueue(payload.queue);
      })
      .subscribe();

    // Fetch initial state
    fetch(`/api/queue/status?memberId=${member.id}${citizenId ? `&citizenId=${citizenId}` : ''}`)
      .then(res => res.json())
      .then(data => {
        setQueue(data.queue || []);
        setCurrentTurn(data.currentTurn || null);
      });

    return () => {
      channel.unsubscribe();
      queueChannel.unsubscribe();
    };
  }, [member.id, citizenId]);

  const queuePosition = citizenId
    ? queue.findIndex(e => e.citizenId === citizenId)
    : -1;

  const isMyTurn = currentTurn?.citizenId === citizenId;

  const raiseHand = useCallback(async (citizenName: string, citizenAvatar: string) => {
    if (!citizenId) return;

    const res = await fetch('/api/queue/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        memberId: member.id,
        citizenId,
        citizenName,
        citizenAvatar,
      }),
    });

    return res.json();
  }, [member.id, citizenId]);

  const leaveQueue = useCallback(async () => {
    if (!citizenId) return;

    const res = await fetch('/api/queue/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id, citizenId }),
    });

    return res.json();
  }, [member.id, citizenId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!citizenId) return;

    const res = await fetch('/api/turn/message', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: member.id, citizenId, content }),
    });

    return res.json();
  }, [member.id, citizenId]);

  return {
    messages,
    queue,
    queueLength: queue.length,
    queuePosition: queuePosition >= 0 ? queuePosition : null,
    currentTurn,
    isMyTurn,
    spectatorCount,
    isStreaming,
    streamingContent,
    raiseHand,
    leaveQueue,
    sendMessage,
  };
}
```

**Step 2: Update hooks index**

```typescript
// apps/web/src/hooks/index.ts
export { useAuth } from './useAuth';
export { useQueue } from './useQueue';
export { useConversationStream } from './useConversationStream';
export { useCouncilOffice } from './useCouncilOffice';
```

**Step 3: Commit**

```bash
git add apps/web/src/hooks/
git commit -m "feat: add useCouncilOffice hook for realtime council interactions"
```

---

## Phase 5: Assets

### Task 11: Generate Council Member Avatars

**Files:**
- Create: `scripts/generate-council-avatars.sh`

Use the existing Gemini → fal.ai → Blender pipeline to generate:
- 7 council member avatars (static PNG + spinning GIF)
- Output to `apps/web/public/assets/council/`

**Step 1: Create generation script**

```bash
#!/bin/bash
# scripts/generate-council-avatars.sh

cd scripts/asset-pipeline

MEMBERS=(
  "mayor_clawrence:A distinguished lobster mayor in formal attire, pixel art style, coastal town leader"
  "treasurer_sheldon:A penny-pinching lobster with glasses and ledger, pixel art style, accountant vibes"
  "clerk_barnacle:A meticulous barnacle-covered lobster clerk with papers, pixel art style, formal and proper"
  "harbormaster_pincers:A salty sea captain lobster with captain hat, pixel art style, weathered sailor"
  "chef_bisque:A passionate lobster chef with chef hat and apron, pixel art style, French cuisine"
  "lighthouse_keeper_luna:A mysterious glowing lobster keeper, pixel art style, ethereal and wise"
  "sheriff_snapper:A gruff lobster sheriff with badge and hat, pixel art style, western lawman"
)

for member in "${MEMBERS[@]}"; do
  IFS=':' read -r name prompt <<< "$member"
  echo "Generating $name..."
  python3 pipeline.py --prompt "$prompt" --name "$name" --output-dir ../../apps/web/public/assets/council/
done

echo "Done! Council member avatars generated."
```

**Step 2: Run script and commit assets**

Run: `bash scripts/generate-council-avatars.sh`

**Step 3: Commit**

```bash
git add apps/web/public/assets/council/ scripts/generate-council-avatars.sh
git commit -m "feat: add council member avatar assets"
```

---

### Task 12: Generate Citizen Avatars

**Files:**
- Create: `scripts/generate-citizen-avatars.sh`

Generate 16 diverse citizen avatars using the same pipeline.

**Step 1: Create generation script**

```bash
#!/bin/bash
# scripts/generate-citizen-avatars.sh

cd scripts/asset-pipeline

PROMPTS=(
  "A friendly lobster citizen, pixel art style, casual coastal wear"
  "A young lobster with a beach hat, pixel art style, cheerful"
  "An elderly wise lobster, pixel art style, spectacles"
  "A lobster fisher with nets, pixel art style, working class"
  # ... 12 more diverse citizen prompts
)

for i in "${!PROMPTS[@]}"; do
  num=$(printf "%02d" $((i+1)))
  echo "Generating citizen_$num..."
  python3 pipeline.py --prompt "${PROMPTS[$i]}" --name "citizen_$num" --output-dir ../../apps/web/public/assets/citizens/
done

echo "Done! Citizen avatars generated."
```

**Step 2: Run and commit**

Run: `bash scripts/generate-citizen-avatars.sh`

**Step 3: Commit**

```bash
git add apps/web/public/assets/citizens/ scripts/generate-citizen-avatars.sh
git commit -m "feat: add 16 citizen avatar assets"
```

---

## Phase 6: Final Integration & Testing

### Task 13: Wire Everything Together

**Files:**
- Modify: `apps/web/src/app/page.tsx`

Complete the integration by:
1. Import all new components and hooks
2. Wire up state management for Town Hall views
3. Connect `useCouncilOffice` hook to `CouncilOffice` component
4. Test the complete flow

**Step 1: Full page.tsx update**

(Implement the complete page with all Town Hall functionality)

**Step 2: Manual testing**

- Open Town Hall
- See lobby with council members (online/offline based on schedule)
- Click online member to enter office
- Watch conversation stream
- Register as citizen via Citizen Registry
- Raise hand, wait in queue, send messages when turn starts

**Step 3: Build and commit**

Run: `pnpm build:check`

```bash
git add apps/web/src/app/page.tsx
git commit -m "feat: complete Town Hall integration with all council features"
```

---

### Task 14: Update Auth to Include Avatar

**Files:**
- Modify: `apps/web/src/hooks/useAuth.ts`

Update the auth hook to:
1. Store citizen avatar in user metadata during registration
2. Return avatar in the hook response

**Step 1: Update useAuth**

Add `avatar` to the citizen profile and update `signUp` to accept avatar parameter.

**Step 2: Commit**

```bash
git add apps/web/src/hooks/useAuth.ts
git commit -m "feat: add avatar support to citizen auth"
```

---

## Verification Checklist

After completing all tasks, verify:

- [ ] `pnpm build` passes
- [ ] Town Hall lobby shows 7 council members
- [ ] Online/offline status updates based on schedule (UTC times)
- [ ] Can enter an online council member's office
- [ ] Spectator count updates in real-time
- [ ] Can register as citizen with name and avatar
- [ ] Can raise hand to join queue
- [ ] Queue position updates
- [ ] Turn starts immediately when position is 0
- [ ] Turn limits work (chars, time, messages)
- [ ] Messages appear in real-time for all spectators
- [ ] Turn ends when limits reached
- [ ] Next person in queue automatically starts

---

## Notes

- All times in council schedules are UTC
- Vercel KV requires `KV_REST_API_URL` and `KV_REST_API_TOKEN` env vars
- Supabase service role key needed for API routes
- Avatar generation uses existing `scripts/asset-pipeline/pipeline.py`
- Citizens table should be updated to remove gender field
