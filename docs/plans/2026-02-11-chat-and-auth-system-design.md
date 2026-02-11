# Chat & Authentication System Design

## Overview

This document describes the complete chat queue system and passwordless authentication for Clawntawn. The goal is a public, shared chat experience where registered citizens can participate in conversations with council members during their office hours.

## Authentication System

### Passwordless Magic Links

- **Single email input** - No separate signup/login pages
- System detects if email exists → sends appropriate magic link
- Magic links expire after 15 minutes
- "By continuing, you agree to our Terms of Service and Privacy Policy" text with links

### New Citizen Registration Flow

1. **Welcome screen** - Clerk Barnacle greeting
2. **Display name** - Text input with validation
3. **Avatar selection** - 4x4 grid of 16 premade choices
4. **Email + captcha** - Enter email, solve captcha
5. **Magic link sent** - User clicks link in email
6. **Profile created** - On magic link success, citizen record created in DB

Profile data (name, avatar) passed via URL parameters in the magic link - no localStorage.

### Returning Citizen Login

1. Enter email + solve captcha
2. Magic link sent → user clicks → logged in

### Captcha Requirements

Captcha required at:
- Signup (magic link request)
- Login (magic link request)
- Raising hand (if 1+ hour since last captcha verification)

Store `last_captcha_at` timestamp on citizen record.

## Chat Room Model

### One Chat Per Online Council Member

- Each council member with active office hours = one public chat room
- If 3 council members online → 3 separate chat rooms
- Everyone can spectate any chat in real-time
- Only registered/logged-in citizens can raise hand
- Guests see "Register to participate" prompt

### Office Hours Lifecycle

1. Chat opens when council member's office hours begin
2. Chat closes when office hours end:
   - Council member sends farewell message automatically
   - Active turn (if any) is ended gracefully
   - Queue is cleared
   - Chat becomes read-only (transcript remains visible)

## Queue System

### Raising Hand

- "Raise hand" button to join queue
- Requires: logged in + captcha (if 1h+ since last verification)
- Queue visible to all spectators (names/avatars in order)

### Ready Check (Position 1)

When you become next in line (position 1):

- **If joined queue < 2 minutes ago** → auto-confirmed as ready
- **If joined queue 2+ minutes ago** → "You're next! Ready?" prompt
  - 30 seconds to confirm
  - No confirmation → skipped and removed from queue
  - Confirmed → remain at position 1, wait for current turn to end

This ensures no dead time between turns - ready check happens during previous person's turn.

### Turn Start

When current turn ends and you're confirmed at position 1:
- Your turn starts immediately
- 20-second timer begins
- All spectators see it's your turn

## Turn System

### Turn Limits

A turn ends when ANY of these limits is hit (whichever first):

| Limit | Value |
|-------|-------|
| Timeout | 20 seconds |
| Message count | 2 messages |
| Character budget | 500 characters total |

### Server-Led Turn Management

- All limit checking happens server-side
- Clients only send messages and receive state updates
- Turn transitions triggered by server, broadcast via Supabase Realtime
- Clients subscribe to updates and react accordingly

### Event-Driven Architecture

Instead of a continuous ticker polling every second:

1. **On message send** - Server checks all limits before processing
2. **Vercel Cron job (every 30s)** - Cleans up stale/abandoned turns
3. **On next action** - Expired turns cleaned up lazily

This is serverless-friendly and cost-effective.

## Conduct & Moderation

### Two-Pass Sanitization (existing)

- **Pass 1**: Regex filtering (URLs, code, prompt injection, profanity)
- **Pass 2**: LLM moderation via Gemini (harassment, hate speech, dangerous content)

### Violation Consequences

| Offense | Consequence |
|---------|-------------|
| 1st violation | Turn ends immediately, message blocked, can rejoin queue |
| 2nd violation | 7-day ban from raising hand (can still spectate) |

### Violation Tracking

- Store `violation_count` on citizen record
- Only violations within last 30 days count toward 2-strike rule
- Store `banned_until` timestamp (null if not banned)

## Data Model

### Citizen Record

```
id: UUID
display_name: string
avatar_id: string (references avatar grid position)
email: string
last_captcha_at: timestamp
violation_count: integer
banned_until: timestamp | null
created_at: timestamp
updated_at: timestamp
```

### Chat Session Record

```
id: UUID
council_member_id: string
started_at: timestamp
ended_at: timestamp | null
status: 'active' | 'closed'
```

### Queue Entry

```
id: UUID
citizen_id: UUID
citizen_name: string
citizen_avatar: string
council_member_id: string
joined_at: timestamp
confirmed_ready: boolean
confirmed_at: timestamp | null
position: integer
```

### Turn Record

```
id: UUID
session_id: UUID
citizen_id: UUID
started_at: timestamp
expires_at: timestamp (started_at + 20s)
message_count: integer
character_count: integer
status: 'active' | 'completed' | 'timed_out' | 'violated'
```

### Violation Log

```
id: UUID
citizen_id: UUID
occurred_at: timestamp
violation_type: string
message_content: string (for review)
```

## Realtime Events

Via Supabase Realtime, broadcast on channel `council-member-{id}`:

| Event | Payload | When |
|-------|---------|------|
| `queue_updated` | Full queue state | Join, leave, skip |
| `ready_check` | `{ citizenId, expiresAt }` | Next in line needs to confirm |
| `turn_started` | `{ citizenId, citizenName, citizenAvatar, expiresAt }` | Turn begins |
| `turn_ended` | `{ citizenId, reason }` | Turn ends (any reason) |
| `message` | `{ role, content, citizenId? }` | Message sent |
| `chat_closing` | `{ farewellMessage }` | Office hours ending |
| `chat_closed` | `{}` | Chat now read-only |

## Implementation Components

| Area | Status | What's Needed |
|------|--------|---------------|
| Auth (magic links) | New | Supabase OTP flow, captcha integration |
| Terms & Privacy | New | Legal pages (parallel workstream) |
| Citizen Record | Update | Add email, captcha timestamp, violation fields |
| Registration UI | Update | New flow: name → avatar → email+captcha |
| Turn System | Update | Change to 20s/500chars/2msgs limits |
| Ready Check | New | Confirmation UI and 30s timeout logic |
| Cron Cleanup | New | Vercel cron for stale turn cleanup |
| Conduct System | New | Violation tracking, 7-day ban logic |
| Office Hours Close | New | Auto-farewell and chat close |
| Guest Blocking | New | "Register to participate" UI |

## Open Items

- Terms of Service content (legal review needed)
- Privacy Policy content (legal review needed)
- Captcha provider choice (e.g., hCaptcha, Cloudflare Turnstile)
