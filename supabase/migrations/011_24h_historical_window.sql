-- Update policies to use 24-hour window instead of just "active"
-- This allows spectators to see recent conversations

-- ============================================
-- CONVERSATION SESSIONS: Active OR last 24 hours
-- ============================================
DROP POLICY IF EXISTS "Active sessions are viewable by everyone" ON conversation_sessions;

CREATE POLICY "Recent sessions are viewable by everyone"
  ON conversation_sessions FOR SELECT
  USING (
    status = 'active'
    OR started_at > now() - interval '24 hours'
  );

-- ============================================
-- CONVERSATION MESSAGES: From recent sessions (24h)
-- ============================================
DROP POLICY IF EXISTS "Messages from active sessions are viewable" ON conversation_messages;

CREATE POLICY "Messages from recent sessions are viewable"
  ON conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_sessions cs
      WHERE cs.id = conversation_messages.session_id
      AND (cs.status = 'active' OR cs.started_at > now() - interval '24 hours')
    )
  );

-- ============================================
-- QUEUE ENTRIES: Active OR last 24 hours
-- ============================================
DROP POLICY IF EXISTS "Active queue entries are viewable" ON queue_entries;

CREATE POLICY "Recent queue entries are viewable"
  ON queue_entries FOR SELECT
  USING (
    status IN ('waiting', 'active', 'ready_check', 'confirmed')
    OR joined_at > now() - interval '24 hours'
  );

-- ============================================
-- TURNS: Active OR last 24 hours
-- ============================================
DROP POLICY IF EXISTS "Active turns are viewable" ON turns;

CREATE POLICY "Recent turns are viewable"
  ON turns FOR SELECT
  USING (
    ended_at IS NULL
    OR started_at > now() - interval '24 hours'
  );
