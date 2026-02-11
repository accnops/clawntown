# Queue System Analysis

## Components Overview

### Database Tables
- `queue_entries`: member_id, citizen_id, status, joined_at, last_heartbeat_at
- `turns`: member_id, citizen_id, session_id, expires_at, ended_at, messages_used, etc.
- `conversation_sessions`: member_id, status
- `conversation_messages`: session_id, role, content, citizen_id

### API Endpoints
| Endpoint | Purpose |
|----------|---------|
| `/api/queue/join` | Join queue, auto-start if first |
| `/api/queue/leave` | Leave queue |
| `/api/queue/heartbeat` | Heartbeat + queue progression |
| `/api/queue/status` | Get current state |
| `/api/turn/start` | Start turn for next in queue |
| `/api/turn/end` | End turn, start next |
| `/api/turn/message` | Send message, auto-end if limit |

### Realtime Events (Supabase Broadcast)
| Event | When |
|-------|------|
| `message` | Message saved |
| `turn_started` | Turn begins |
| `turn_ended` | Turn ends |

---

## Example: 2 Users (Alice and Bob)

### Timeline

```
T0: Alice joins queue (empty)
    → queue_entry created (waiting)
    → position=0, no active turn
    → auto-calls /api/turn/start
    → turn created, queue_entry→active
    → broadcast: turn_started
    → Alice sees: "Your turn!"

T1: Bob joins queue
    → queue_entry created (waiting)
    → position=0 (0 people ahead with status=waiting)
    → BUT there's an active turn (Alice)
    → no auto-start
    → Bob sees: "You're next! Get ready..."
    → Bob starts heartbeat loop

T2: Alice sends message 1/2
    → message saved
    → broadcast: message (citizen)
    → broadcast: message (council)
    → Both see messages in chat
    → turn.messages_used = 1

T3: Alice sends message 2/2 (limit reached)
    → message saved
    → shouldEnd = true
    → turn ended, queue_entry→completed
    → broadcast: turn_ended
    → ⚠️ Bob's turn NOT started yet!
    → Alice sees: "Thanks for chatting!"
    → Bob still sees: "You're next!"

T4: Bob's heartbeat (up to 15s later)
    → progress_queue runs
    → no active turn, Bob first in queue
    → turn created for Bob
    → broadcast: turn_started
    → Bob sees: "Your turn!"
```

---

## Issues Identified

### 1. ❌ Next Turn Not Auto-Started on Message Limit
**Location:** `/api/turn/message`

When Alice's turn ends due to message limit, Bob has to wait for his next heartbeat (up to 15s) to get his turn.

**Fix:** After ending turn, auto-start next person's turn.

### 2. ❌ Heartbeat Latency for Position 0
Even at position 0, heartbeat is every 15 seconds. If turn ends right after heartbeat, user waits 15s.

**Fix Options:**
- A) Server auto-starts next turn (preferred)
- B) Realtime event triggers immediate heartbeat
- C) Reduce position 0 interval to 5s

### 3. ❌ Queue Leave Doesn't Broadcast
**Location:** `/api/queue/leave`

Other users don't know queue length changed.

**Fix:** Broadcast queue update or `turn_ended` with updated queueLength.

### 4. ❌ Client Doesn't Update State on leftQueue
**Location:** `useCouncilOffice.sendMessage`

When response includes `leftQueue: true`, client doesn't update `inQueueRef` or `queuePosition`.

**Fix:** Handle `leftQueue` in response.

### 5. ⚠️ Client Doesn't Use currentTurn from Heartbeat
**Location:** `useCouncilOffice` heartbeat handler

Heartbeat returns `currentTurn` but client doesn't sync it.

**Fix:** Update `setCurrentTurn(data.currentTurn)` in heartbeat handler.

### 6. ⚠️ Race Condition in Queue Join
**Location:** `/api/queue/join`

If two users join simultaneously for position 0, both might try to start turn.

**Mitigation:** `progress_queue` uses `pg_advisory_xact_lock`, but `/api/queue/join` doesn't.

---

## Recommended Improvements

### High Priority (Correctness)

1. **Auto-start next turn on message limit**
```typescript
// In /api/turn/message after shouldEnd
if (nextInQueue) {
  await fetch('/api/turn/start', { ... });
}
```

2. **Handle leftQueue in client**
```typescript
if (data.leftQueue) {
  setQueuePosition(null);
  inQueueRef.current = false;
}
```

3. **Sync currentTurn from heartbeat**
```typescript
if (data.currentTurn) {
  setCurrentTurn(normalizeTurn(data.currentTurn));
}
```

### Medium Priority (Responsiveness)

4. **Broadcast on queue leave**
```typescript
// In /api/queue/leave
channel.httpSend('queue_updated', { queueLength });
```

5. **Reduce position 0 heartbeat to 5s**
```sql
WHEN v_position = 0 THEN 5000  -- 5s instead of 15s
```

### Low Priority (Polish)

6. **Add queue position to broadcasts**
Include queue positions in `turn_started` so waiting users can update their position immediately.

7. **Optimistic queue position decrement**
Already done: client decrements position on `turn_started` broadcast.

---

## State Propagation Matrix

| Event | Who Should Know | Current | Improved |
|-------|-----------------|---------|----------|
| User joins queue | All spectators | ❌ No broadcast | Add broadcast |
| User leaves queue | All spectators | ❌ No broadcast | Add broadcast |
| Turn starts | All spectators | ✅ Broadcast | ✅ |
| Turn ends | All spectators | ✅ Broadcast | ✅ |
| Message sent | All spectators | ✅ Broadcast | ✅ |
| Queue position change | Waiting users | ⚠️ Via heartbeat | Instant via broadcast |
