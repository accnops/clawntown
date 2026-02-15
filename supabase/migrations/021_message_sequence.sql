-- Message Sequence Numbers for Consistent Ordering
-- Fixes race condition where after() inserts can complete out of order
--
-- Design: Even/Odd encoding for roles
--   - Even seq (0, 2, 4...) = citizen messages
--   - Odd seq (1, 3, 5...) = council messages
--   - Each citizen+council exchange is a "pair" (pair 0 = seqs 0,1; pair 1 = seqs 2,3; etc.)
--
-- This encoding allows:
--   1. Role inference from seq number (seq % 2 == 0 means citizen)
--   2. Gap detection for in-flight messages
--   3. Correct ordering even with deferred inserts

-- Add pair counter to sessions (atomic source of truth)
-- next_pair tracks how many citizen+council exchanges have been allocated
ALTER TABLE conversation_sessions
ADD COLUMN IF NOT EXISTS next_pair INT NOT NULL DEFAULT 0;

-- Add sequence number to messages
ALTER TABLE conversation_messages
ADD COLUMN IF NOT EXISTS seq INT;

-- Backfill existing messages with sequential seq numbers based on created_at
-- Note: Existing data may not follow even/odd pattern (e.g., citizen, citizen, council)
-- The even/odd enforcement is for NEW messages going forward only
WITH numbered AS (
  SELECT
    id,
    ROW_NUMBER() OVER (PARTITION BY session_id ORDER BY created_at) - 1 AS seq
  FROM conversation_messages
)
UPDATE conversation_messages m
SET seq = numbered.seq
FROM numbered
WHERE m.id = numbered.id;

-- Now make seq NOT NULL
ALTER TABLE conversation_messages
ALTER COLUMN seq SET NOT NULL;

-- Update sessions' next_pair based on existing messages
-- next_pair = max_pair_used + 1, where pair = seq / 2
UPDATE conversation_sessions s
SET next_pair = COALESCE(
  (SELECT MAX(seq / 2) + 1 FROM conversation_messages WHERE session_id = s.id),
  0
);

-- Drop old index and create new one with seq
DROP INDEX IF EXISTS idx_messages_session_created;
CREATE INDEX idx_messages_session_seq ON conversation_messages(session_id, seq);

-- Atomic function to allocate a message pair for an exchange
-- Returns the pair number, from which you compute:
--   citizen_seq = pair * 2 (even)
--   council_seq = pair * 2 + 1 (odd)
--
-- This is safe even if previous messages haven't been stored yet:
--   - The pair counter on the session is the source of truth
--   - Each call atomically increments and returns the previous value
--   - Horizontal scaling is safe due to row-level locking on UPDATE
CREATE OR REPLACE FUNCTION allocate_message_pair(
  p_session_id UUID
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_pair INT;
BEGIN
  -- Atomically increment pair counter and return the allocated pair
  -- The UPDATE acquires a row-level lock, ensuring serialization
  UPDATE conversation_sessions
  SET next_pair = next_pair + 1
  WHERE id = p_session_id
  RETURNING next_pair - 1 INTO v_pair;

  IF v_pair IS NULL THEN
    RAISE EXCEPTION 'Session not found: %', p_session_id;
  END IF;

  RETURN v_pair;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION allocate_message_pair(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION allocate_message_pair(UUID) TO service_role;

-- Keep old function name as alias for backwards compatibility (remove after deploy)
CREATE OR REPLACE FUNCTION allocate_message_seqs(
  p_session_id UUID,
  p_count INT DEFAULT 1
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_pair INT;
BEGIN
  -- Allocate a pair and return the citizen seq (even)
  SELECT allocate_message_pair(p_session_id) INTO v_pair;
  RETURN v_pair * 2;
END;
$$;

GRANT EXECUTE ON FUNCTION allocate_message_seqs(UUID, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION allocate_message_seqs(UUID, INT) TO service_role;
