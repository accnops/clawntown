-- Restrict public access to only current/active data
-- Historical sessions and messages should not be publicly queryable

-- ============================================
-- CONVERSATION SESSIONS: Only active sessions visible
-- ============================================
DROP POLICY IF EXISTS "Sessions are viewable by everyone" ON conversation_sessions;

CREATE POLICY "Active sessions are viewable by everyone"
  ON conversation_sessions FOR SELECT
  USING (status = 'active');

-- Service role can read all (for admin/analytics)
CREATE POLICY "Service role can read all sessions"
  ON conversation_sessions FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================
-- CONVERSATION MESSAGES: Only from active sessions
-- ============================================
DROP POLICY IF EXISTS "Messages are viewable by everyone" ON conversation_messages;

CREATE POLICY "Messages from active sessions are viewable"
  ON conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversation_sessions cs
      WHERE cs.id = conversation_messages.session_id
      AND cs.status = 'active'
    )
  );

-- Service role can read all (for admin/analytics)
CREATE POLICY "Service role can read all messages"
  ON conversation_messages FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================
-- QUEUE ENTRIES: Only waiting/active entries visible
-- ============================================
DROP POLICY IF EXISTS "Queue entries are viewable by everyone" ON queue_entries;

CREATE POLICY "Active queue entries are viewable"
  ON queue_entries FOR SELECT
  USING (status IN ('waiting', 'active', 'ready_check', 'confirmed'));

-- Users can always see their own entries (even completed)
CREATE POLICY "Users can view own queue entries"
  ON queue_entries FOR SELECT
  USING (auth.uid() = citizen_id);

-- Service role can read all
CREATE POLICY "Service role can read all queue entries"
  ON queue_entries FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================
-- TURNS: Only active turns visible publicly
-- ============================================
DROP POLICY IF EXISTS "Turns are viewable by everyone" ON turns;

CREATE POLICY "Active turns are viewable"
  ON turns FOR SELECT
  USING (ended_at IS NULL);

-- Users can see their own turns (for history)
CREATE POLICY "Users can view own turns"
  ON turns FOR SELECT
  USING (auth.uid() = citizen_id);

-- Service role can read all
CREATE POLICY "Service role can read all turns"
  ON turns FOR SELECT
  USING (auth.role() = 'service_role');

-- ============================================
-- CITIZENS: Keep public (just names/avatars)
-- ============================================
-- No change - citizen profiles are public by design
