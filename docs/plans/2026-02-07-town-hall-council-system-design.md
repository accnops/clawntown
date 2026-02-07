# Town Hall Council System Design

> **Date:** 2026-02-07

## Overview

The Town Hall is Clawntown's civic hub where citizens interact with council members in live, public conversations. Seven council members staff the hall on a rotating schedule, each with their own personality and conversation stream.

## Council Members

| Member | Role | Personality |
|--------|------|-------------|
| Mayor Clawrence | Town leader | Warm, civic-minded, loves lobster puns |
| Treasurer Sheldon | Treasury & finances | Penny-pinching, precise, numbers-focused |
| Clerk Barnacle | Records & administration | Meticulous, by-the-book, formal |
| Harbormaster Pincers | Docks & maritime affairs | Salty, practical, nautical idioms |
| Chef Bisque | Culinary & hospitality | Passionate, dramatic, food metaphors |
| Lighthouse Keeper Luna | Guidance & philosophy | Mysterious, poetic, contemplative |
| Sheriff Snapper | Peace & order | Gruff, fair, direct lawman speak |

Each member has:
- Distinct AI personality (system prompt)
- Static avatar image
- Spinning avatar GIF (like the town sigil)
- Weekly office hours schedule

## Office Hours Schedule

- Static weekly schedule (same every week)
- Minimum 2 members online at all times
- Typically 3-4 online, up to 5 during peak hours
- Schedule designed to cover multiple timezones
- Luna works nights (fits lighthouse keeper), Mayor has prime daytime hours, etc.

## Town Hall UI

### Lobby View
- Shows all 7 council members as portraits/cards
- Online members highlighted (green indicator)
- Offline members grayed out with next availability
- Citizen Registry Office for registration
- Click any member to enter their office

### Office View
- Header: Member avatar, name, role
- Spectator count: "X citizens watching"
- Chat stream: Scrolling conversation
- Queue display: "X citizens waiting" + your position if queued
- Actions: "Raise Hand" / "Leave Queue" buttons
- When it's your turn: Input field with timer + character count

### Citizen Registry Office
- Thematic registration experience
- Clerk Barnacle greets newcomers
- Flow: Display name → Avatar selection → Auth → Welcome message
- 16 avatar choices in 4x4 grid
- Spinning GIF preview when avatar selected

## Conversation Flow

### Spectator Experience
- Anyone can watch (no login required)
- See messages appear in real-time
- See spectator count
- Read-only stream

### Participation Flow
1. Citizen clicks "Raise Hand" (requires login)
2. Joins queue, sees their position
3. When turn comes, it starts immediately (no grace period)
4. Citizen types and sends messages, council member responds

### Turn Limits
Turn ends when ANY of these is hit first:
- **Character budget:** Max N characters of total citizen input
- **Time limit:** 20 seconds of typing time (clock pauses during council response)
- **Exchange limit:** Max 2 messages from the citizen

### Session Transcripts
- Full transcript saved when council member goes offline
- Browsable by anyone from member's office or Town Records

## Citizen Registration

### Access Levels
- **Anonymous:** Can browse town, watch conversations
- **Registered citizen:** Can raise hand to speak

### Registration Data
- Display name
- Avatar (1 of 16 choices)
- Auth (email/password or OAuth)
- Created date

## Technical Architecture

### Stack
- **Next.js API routes** - All server logic
- **Vercel KV (Redis)** - Hot queue data, timers, spectator counts
- **Supabase** - Persistent data, realtime broadcasting

### Vercel KV Data
```
queue:{memberId}         → ordered list of citizenIds
turn:{memberId}          → { citizenId, charsUsed, timeUsedMs, messagesUsed, startedAt }
spectators:{memberId}    → count
online:{memberId}        → boolean
```

### API Routes
- `POST /api/queue/join` - Add to queue
- `POST /api/queue/leave` - Leave queue
- `POST /api/turn/message` - Send message (checks limits)
- `GET /api/turn/status` - Get current turn state

### Timer Handling
- Store `turnStartedAt` in Redis
- Client shows countdown based on start time
- On message submit: API checks elapsed time server-side
- Turn expiry via client call or Redis key expiry

### Realtime Channels (Supabase)
```
council:{memberId}        → messages, turn events
council:{memberId}:queue  → queue position updates
council:{memberId}:meta   → spectator count, online status
lobby                     → which members are online/offline
```

### Spectator Counting
- Supabase Realtime Presence on council channels
- Automatically tracks connected clients

## Data Model

```typescript
interface CouncilMember {
  id: string;
  name: string;
  role: string;
  personality: string;
  avatar: string;
  avatarSpinning: string;
  schedule: OfficeHours[];
}

interface OfficeHours {
  dayOfWeek: number; // 0-6
  startHour: number; // 0-23
  endHour: number;
}

interface ConversationSession {
  id: string;
  memberId: string;
  startedAt: Date;
  endedAt: Date | null;
  status: 'active' | 'ended';
}

interface ConversationMessage {
  id: string;
  sessionId: string;
  role: 'citizen' | 'council';
  citizenId: string | null;
  citizenName: string | null;
  content: string;
  createdAt: Date;
}

interface QueueEntry {
  id: string;
  sessionId: string;
  citizenId: string;
  joinedAt: Date;
  status: 'waiting' | 'active' | 'completed';
}

interface CitizenTurn {
  id: string;
  sessionId: string;
  citizenId: string;
  charsUsed: number;
  charBudget: number;
  timeUsedMs: number;
  timeBudgetMs: number; // 20000
  messagesUsed: number;
  messageLimit: number; // 2
  startedAt: Date;
  endedAt: Date | null;
}

interface Citizen {
  id: string;
  name: string;
  avatar: string;
  createdAt: Date;
}
```

## Assets to Generate

Using Gemini → fal.ai → Blender pipeline:
- 7 council member avatars (static + spinning GIF)
- 16 citizen avatars (static + spinning GIF)

## Implementation Notes

- Remove or refactor existing 1-on-1 Mayor Clawrence conversation system
- Update Town Hall building click handler to open lobby
- Add Vercel KV to project dependencies
- Create detailed office hours schedule ensuring 2+ online at all times
- Write distinct system prompts for each council member
