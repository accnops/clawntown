# Queue Entry State Machine

## States

| State | Description |
|-------|-------------|
| `(none)` | User not in queue (no entry exists) |
| `waiting` | User is in queue, waiting for their turn |
| `active` | User's turn is currently in progress |
| `completed` | User finished their turn normally |
| `skipped` | User was removed from queue without getting a turn |

> Note: `ready_check` and `confirmed` states exist in schema but are not currently used.

---

## State Diagram

```
                                    ┌─────────────────────────────────────────────┐
                                    │                                             │
                                    ▼                                             │
┌────────┐  join queue   ┌─────────────┐  turn starts   ┌────────┐              │
│ (none) │──────────────▶│   waiting   │───────────────▶│ active │              │
└────────┘               └─────────────┘                └────────┘              │
    ▲                          │                             │                   │
    │                          │                             │                   │
    │  leave queue             │ stale heartbeat             │ message limit     │
    │  (DELETE)                │ council offline             │ turn timeout      │
    │                          │ turn expired cleanup        │ violation         │
    │                          ▼                             │ manual end        │
    │                    ┌─────────────┐                     │                   │
    │                    │   skipped   │                     │                   │
    │                    └─────────────┘                     │                   │
    │                          │                             │                   │
    │                          │                             ▼                   │
    │                          │                       ┌───────────┐             │
    │                          │                       │ completed │             │
    │                          │                       └───────────┘             │
    │                          │                             │                   │
    └──────────────────────────┴─────────────────────────────┴───────────────────┘
                              (terminal states - entry stays in DB for history)
```

---

## Transitions

### 1. `(none)` → `waiting`
**Trigger:** User joins queue
**Endpoint:** `POST /api/queue/join`
**Logic:**
```typescript
await supabase.from('queue_entries').insert({
  member_id: memberId,
  citizen_id: citizenId,
  status: 'waiting',
  last_heartbeat_at: new Date().toISOString(),
});
```

---

### 2. `waiting` → `active`
**Trigger:** User's turn starts
**Endpoints:**
- `POST /api/turn/start` (direct)
- `POST /api/queue/heartbeat` → `progress_queue()` (via heartbeat)
- `POST /api/queue/join` → auto-start if first (indirect)

**Logic (in /api/turn/start):**
```typescript
await supabase.from('queue_entries')
  .update({ status: 'active' })
  .eq('id', nextInQueue.id);
```

**Logic (in progress_queue SQL):**
```sql
UPDATE queue_entries SET status = 'active' WHERE id = v_next_entry.id;
```

---

### 3. `active` → `completed`
**Trigger:** Turn ends normally
**Endpoints:**
- `POST /api/turn/message` (message limit reached)
- `POST /api/turn/end` (manual/timeout)
- `POST /api/queue/heartbeat` → `progress_queue()` (turn expired)
- Cleanup function (turn expired)

**Logic (in /api/turn/message):**
```typescript
if (shouldEnd) {
  await supabase.from('queue_entries')
    .update({ status: 'completed' })
    .eq('citizen_id', citizenId)
    .eq('member_id', memberId)
    .eq('status', 'active');
}
```

**Logic (in /api/turn/end):**
```typescript
await supabase.from('queue_entries')
  .update({ status: 'completed' })
  .eq('citizen_id', turn.citizen_id)
  .eq('member_id', memberId)
  .eq('status', 'active');
```

**Logic (in progress_queue SQL):**
```sql
UPDATE queue_entries SET status = 'completed'
WHERE member_id = p_member_id
  AND citizen_id = v_current_turn.citizen_id
  AND status = 'active';
```

---

### 4. `active` → `completed` (violation)
**Trigger:** Message rejected due to content violation
**Endpoint:** `POST /api/turn/message`

**Logic:**
```typescript
// After LLM moderation fails
await supabase.from('queue_entries')
  .update({ status: 'completed' })
  .eq('citizen_id', citizenId)
  .eq('member_id', memberId)
  .eq('status', 'active');
```

---

### 5. `waiting` → `skipped`
**Trigger:** User skipped without getting a turn
**Causes:**
- Stale heartbeat (no heartbeat in 3+ minutes)
- Council member went offline
- Turn expired and user was next but stale

**Endpoints:**
- `POST /api/turn/start` (skips stale entries before starting)
- `POST /api/queue/heartbeat` (council offline)
- `progress_queue()` SQL function
- Cleanup function

**Logic (in /api/turn/start):**
```typescript
const staleThreshold = new Date(Date.now() - 3 * 60 * 1000).toISOString();
await supabase.from('queue_entries')
  .update({ status: 'skipped' })
  .eq('member_id', memberId)
  .eq('status', 'waiting')
  .or(`last_heartbeat_at.is.null,last_heartbeat_at.lt.${staleThreshold}`);
```

**Logic (in /api/queue/heartbeat - council offline):**
```typescript
await supabase.from('queue_entries')
  .update({ status: 'skipped' })
  .eq('member_id', memberId)
  .in('status', ['waiting', 'ready_check', 'confirmed']);
```

**Logic (in progress_queue SQL):**
```sql
UPDATE queue_entries SET status = 'skipped'
WHERE member_id = p_member_id
  AND status = 'waiting'
  AND (last_heartbeat_at IS NULL OR last_heartbeat_at < v_stale_cutoff);
```

---

### 6. `waiting` → `(deleted)`
**Trigger:** User voluntarily leaves queue
**Endpoint:** `POST /api/queue/leave`

**Logic:**
```typescript
await supabase.from('queue_entries')
  .delete()
  .eq('member_id', memberId)
  .eq('citizen_id', citizenId)
  .eq('status', 'waiting');
```

> Note: Only `waiting` entries can be deleted. Active entries must complete or be skipped.

---

## Heartbeat Updates (not a state transition)

**Trigger:** Client sends periodic heartbeat
**Endpoint:** `POST /api/queue/heartbeat`

**Logic (in progress_queue SQL):**
```sql
UPDATE queue_entries SET last_heartbeat_at = v_now
WHERE member_id = p_member_id
  AND citizen_id = p_citizen_id
  AND status IN ('waiting', 'ready_check', 'confirmed');
```

---

## Summary Table

| From | To | Trigger | Endpoint/Function |
|------|-----|---------|-------------------|
| (none) | waiting | Join queue | `/api/queue/join` |
| waiting | active | Turn starts | `/api/turn/start`, `progress_queue()` |
| active | completed | Message limit | `/api/turn/message` |
| active | completed | Manual end | `/api/turn/end` |
| active | completed | Turn expired | `progress_queue()`, cleanup |
| active | completed | Violation | `/api/turn/message` |
| waiting | skipped | Stale heartbeat | `/api/turn/start`, `progress_queue()`, cleanup |
| waiting | skipped | Council offline | `/api/queue/heartbeat`, cleanup |
| waiting | (deleted) | Leave queue | `/api/queue/leave` |

---

## Terminal States

Both `completed` and `skipped` are terminal states. Entries remain in the database for historical tracking but cannot transition to any other state.

To rejoin the queue, user must create a new entry (call `/api/queue/join` again).
