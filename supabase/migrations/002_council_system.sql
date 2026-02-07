-- Council System Schema
-- Run this in Supabase SQL Editor: https://supabase.com/dashboard/project/tnjqvklhhbljosfilnfe/sql

-- ============================================
-- CITIZENS TABLE (auth-linked)
-- ============================================
CREATE TABLE IF NOT EXISTS citizens (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  avatar TEXT NOT NULL,  -- one of 16 avatar choices
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for looking up by name (display purposes)
CREATE INDEX IF NOT EXISTS idx_citizens_name ON citizens(name);

-- ============================================
-- CONVERSATION SESSIONS
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT NOT NULL,  -- council member id
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'ended'))
);

-- One active session per member at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_member_active
  ON conversation_sessions(member_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_sessions_member_status
  ON conversation_sessions(member_id, status);

-- ============================================
-- CONVERSATION MESSAGES
-- ============================================
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('citizen', 'council')),
  citizen_id UUID REFERENCES citizens(id),
  citizen_name TEXT,  -- denormalized for display
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fast lookup of messages in a session
CREATE INDEX IF NOT EXISTS idx_messages_session_created
  ON conversation_messages(session_id, created_at);

-- ============================================
-- QUEUE ENTRIES (hot table!)
-- ============================================
CREATE TABLE IF NOT EXISTS queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT NOT NULL,
  citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'completed')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CRITICAL: Partial index for fast queue queries (only waiting entries)
CREATE INDEX IF NOT EXISTS idx_queue_member_waiting
  ON queue_entries(member_id, joined_at)
  WHERE status = 'waiting';

-- Fast lookup of citizen's queue position
CREATE INDEX IF NOT EXISTS idx_queue_citizen_active
  ON queue_entries(citizen_id, status)
  WHERE status IN ('waiting', 'active');

-- Prevent duplicate waiting entries for same citizen+member
CREATE UNIQUE INDEX IF NOT EXISTS idx_queue_no_duplicate_waiting
  ON queue_entries(member_id, citizen_id)
  WHERE status = 'waiting';

-- ============================================
-- TURNS (hot table - one active per member)
-- ============================================
CREATE TABLE IF NOT EXISTS turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT NOT NULL,
  session_id UUID NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  citizen_id UUID NOT NULL REFERENCES citizens(id) ON DELETE CASCADE,
  chars_used INT NOT NULL DEFAULT 0,
  char_budget INT NOT NULL DEFAULT 500,
  messages_used INT NOT NULL DEFAULT 0,
  message_limit INT NOT NULL DEFAULT 2,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,  -- started_at + 20 seconds
  ended_at TIMESTAMPTZ
);

-- Only one active turn per member (enforced by unique constraint)
CREATE UNIQUE INDEX IF NOT EXISTS idx_turns_member_active
  ON turns(member_id)
  WHERE ended_at IS NULL;

-- For cleanup of expired turns
CREATE INDEX IF NOT EXISTS idx_turns_expires
  ON turns(expires_at)
  WHERE ended_at IS NULL;

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE citizens ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE turns ENABLE ROW LEVEL SECURITY;

-- Citizens: users can read all, but only update their own
CREATE POLICY "Citizens are viewable by everyone"
  ON citizens FOR SELECT USING (true);

CREATE POLICY "Users can update own citizen profile"
  ON citizens FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own citizen profile"
  ON citizens FOR INSERT WITH CHECK (auth.uid() = id);

-- Sessions: readable by all (public conversations)
CREATE POLICY "Sessions are viewable by everyone"
  ON conversation_sessions FOR SELECT USING (true);

-- Messages: readable by all (public conversations)
CREATE POLICY "Messages are viewable by everyone"
  ON conversation_messages FOR SELECT USING (true);

-- Queue: readable by all, writable by authenticated users for themselves
CREATE POLICY "Queue entries are viewable by everyone"
  ON queue_entries FOR SELECT USING (true);

CREATE POLICY "Users can join queue"
  ON queue_entries FOR INSERT WITH CHECK (auth.uid() = citizen_id);

CREATE POLICY "Users can leave queue"
  ON queue_entries FOR UPDATE USING (auth.uid() = citizen_id);

CREATE POLICY "Users can delete own queue entry"
  ON queue_entries FOR DELETE USING (auth.uid() = citizen_id);

-- Turns: readable by all
CREATE POLICY "Turns are viewable by everyone"
  ON turns FOR SELECT USING (true);

-- ============================================
-- REALTIME SUBSCRIPTIONS
-- ============================================
-- Enable realtime for hot tables
ALTER PUBLICATION supabase_realtime ADD TABLE conversation_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE queue_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE turns;

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get queue position for a citizen
CREATE OR REPLACE FUNCTION get_queue_position(p_member_id TEXT, p_citizen_id UUID)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM queue_entries
  WHERE member_id = p_member_id
    AND status = 'waiting'
    AND joined_at < (
      SELECT joined_at
      FROM queue_entries
      WHERE member_id = p_member_id
        AND citizen_id = p_citizen_id
        AND status = 'waiting'
    );
$$ LANGUAGE SQL STABLE;

-- Function to get queue length for a member
CREATE OR REPLACE FUNCTION get_queue_length(p_member_id TEXT)
RETURNS INT AS $$
  SELECT COUNT(*)::INT
  FROM queue_entries
  WHERE member_id = p_member_id AND status = 'waiting';
$$ LANGUAGE SQL STABLE;
