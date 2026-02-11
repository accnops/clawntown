-- Email-based Violations System
-- Tracks violations by email address to prevent ban evasion via account recreation

-- ============================================
-- EMAIL VIOLATIONS (aggregate per email)
-- ============================================
CREATE TABLE IF NOT EXISTS email_violations (
  email TEXT PRIMARY KEY,
  violation_count INT NOT NULL DEFAULT 0,
  last_violation_at TIMESTAMPTZ,
  banned_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for checking active bans
CREATE INDEX IF NOT EXISTS idx_email_violations_banned
  ON email_violations(banned_until)
  WHERE banned_until IS NOT NULL;

-- ============================================
-- VIOLATION LOG (audit trail)
-- ============================================
CREATE TABLE IF NOT EXISTS violation_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  citizen_id UUID REFERENCES citizens(id) ON DELETE SET NULL,  -- may be null if account deleted
  turn_id UUID REFERENCES turns(id) ON DELETE SET NULL,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  violation_type TEXT NOT NULL CHECK (violation_type IN (
    'profanity', 'injection', 'harassment', 'hate_speech', 'dangerous', 'spam'
  )),
  message_content TEXT,  -- truncated for storage, for review purposes
  action_taken TEXT NOT NULL CHECK (action_taken IN ('turn_ended', 'banned'))
);

-- Index for looking up violations by email
CREATE INDEX IF NOT EXISTS idx_violation_log_email
  ON violation_log(email, occurred_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE email_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE violation_log ENABLE ROW LEVEL SECURITY;

-- Only service role can read/write violations (admin operations)
-- No public access to violation data

-- ============================================
-- HELPER FUNCTION: Record a violation
-- ============================================
CREATE OR REPLACE FUNCTION record_violation(
  p_email TEXT,
  p_citizen_id UUID,
  p_turn_id UUID,
  p_violation_type TEXT,
  p_message_content TEXT
) RETURNS TABLE (
  violation_count INT,
  is_banned BOOLEAN,
  banned_until TIMESTAMPTZ
) AS $$
DECLARE
  v_count INT;
  v_banned_until TIMESTAMPTZ;
  v_thirty_days_ago TIMESTAMPTZ := now() - interval '30 days';
  v_ban_duration INTERVAL := interval '7 days';
BEGIN
  -- Normalize email
  p_email := lower(trim(p_email));

  -- Insert into violation log
  INSERT INTO violation_log (email, citizen_id, turn_id, violation_type, message_content, action_taken)
  VALUES (p_email, p_citizen_id, p_turn_id, p_violation_type, left(p_message_content, 500), 'turn_ended');

  -- Count recent violations (last 30 days)
  SELECT COUNT(*) INTO v_count
  FROM violation_log
  WHERE email = p_email AND occurred_at > v_thirty_days_ago;

  -- Update or insert email_violations record
  INSERT INTO email_violations (email, violation_count, last_violation_at, updated_at)
  VALUES (p_email, v_count, now(), now())
  ON CONFLICT (email) DO UPDATE SET
    violation_count = v_count,
    last_violation_at = now(),
    updated_at = now();

  -- Check if ban threshold reached (2+ violations in 30 days)
  IF v_count >= 2 THEN
    v_banned_until := now() + v_ban_duration;

    UPDATE email_violations
    SET banned_until = v_banned_until, updated_at = now()
    WHERE email = p_email;

    -- Update the log entry to reflect ban was applied
    UPDATE violation_log
    SET action_taken = 'banned'
    WHERE email = p_email AND occurred_at = (
      SELECT MAX(occurred_at) FROM violation_log WHERE email = p_email
    );

    RETURN QUERY SELECT v_count, true, v_banned_until;
  ELSE
    RETURN QUERY SELECT v_count, false, NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Check if email is banned
-- ============================================
CREATE OR REPLACE FUNCTION is_email_banned(p_email TEXT)
RETURNS TABLE (
  is_banned BOOLEAN,
  banned_until TIMESTAMPTZ
) AS $$
BEGIN
  p_email := lower(trim(p_email));

  RETURN QUERY
  SELECT
    COALESCE(ev.banned_until > now(), false) AS is_banned,
    ev.banned_until
  FROM email_violations ev
  WHERE ev.email = p_email;

  -- If no record found, return not banned
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, NULL::TIMESTAMPTZ;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
