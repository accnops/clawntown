-- Increase violation threshold from 2 to 3 before ban

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

  -- Check if ban threshold reached (3+ violations in 30 days)
  IF v_count >= 3 THEN
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
