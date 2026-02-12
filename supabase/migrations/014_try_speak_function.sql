-- Atomic "try to speak" function
-- Returns 'turn_started' if queue was empty and we got the turn
-- Returns 'queued' if someone else was there first (race condition)

CREATE OR REPLACE FUNCTION try_speak(
  p_member_id TEXT,
  p_citizen_id UUID,
  p_citizen_name TEXT,
  p_citizen_avatar TEXT,
  p_char_budget INT DEFAULT 256,
  p_message_limit INT DEFAULT 1,
  p_time_budget_seconds INT DEFAULT 10
) RETURNS TABLE (
  action TEXT,
  turn_id UUID,
  session_id UUID,
  queue_position INT,
  queue_length INT
) AS $$
DECLARE
  v_existing_entry RECORD;
  v_current_turn RECORD;
  v_session_id UUID;
  v_turn_id UUID;
  v_position INT;
  v_queue_len INT;
  v_now TIMESTAMPTZ := now();
BEGIN
  -- Lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('queue_speak_' || p_member_id));

  -- Check if citizen is already in queue
  SELECT * INTO v_existing_entry
  FROM queue_entries
  WHERE member_id = p_member_id
    AND citizen_id = p_citizen_id
    AND status IN ('waiting', 'active');

  IF v_existing_entry IS NOT NULL THEN
    -- Already in queue, return current position
    IF v_existing_entry.status = 'active' THEN
      -- Already has turn - shouldn't happen but handle it
      SELECT id INTO v_turn_id FROM turns WHERE member_id = p_member_id AND ended_at IS NULL;
      v_queue_len := (SELECT COUNT(*)::INT FROM queue_entries WHERE member_id = p_member_id AND status = 'waiting');
      RETURN QUERY SELECT 'already_has_turn'::TEXT, v_turn_id, NULL::UUID, 0, v_queue_len;
      RETURN;
    ELSE
      -- Waiting in queue
      SELECT COUNT(*)::INT INTO v_position
      FROM queue_entries
      WHERE member_id = p_member_id
        AND status = 'waiting'
        AND joined_at < v_existing_entry.joined_at;
      v_queue_len := (SELECT COUNT(*)::INT FROM queue_entries WHERE member_id = p_member_id AND status = 'waiting');
      RETURN QUERY SELECT 'already_in_queue'::TEXT, NULL::UUID, NULL::UUID, v_position, v_queue_len;
      RETURN;
    END IF;
  END IF;

  -- Check if there's an active turn
  SELECT * INTO v_current_turn
  FROM turns
  WHERE member_id = p_member_id AND ended_at IS NULL;

  -- Check if there's anyone waiting
  v_queue_len := (SELECT COUNT(*)::INT FROM queue_entries WHERE member_id = p_member_id AND status = 'waiting');

  IF v_current_turn IS NOT NULL OR v_queue_len > 0 THEN
    -- Queue is not empty - join and wait
    INSERT INTO queue_entries (member_id, citizen_id, citizen_name, citizen_avatar, status, last_heartbeat_at)
    VALUES (p_member_id, p_citizen_id, p_citizen_name, p_citizen_avatar, 'waiting', v_now);

    v_position := v_queue_len; -- We're at the end
    v_queue_len := v_queue_len + 1;

    RETURN QUERY SELECT 'queued'::TEXT, NULL::UUID, NULL::UUID, v_position, v_queue_len;
    RETURN;
  END IF;

  -- Queue is empty! We can start immediately
  -- Get or create session
  SELECT id INTO v_session_id
  FROM conversation_sessions
  WHERE member_id = p_member_id AND status = 'active';

  IF v_session_id IS NULL THEN
    INSERT INTO conversation_sessions (member_id, status)
    VALUES (p_member_id, 'active')
    RETURNING id INTO v_session_id;
  END IF;

  -- Create queue entry as active
  INSERT INTO queue_entries (member_id, citizen_id, citizen_name, citizen_avatar, status, last_heartbeat_at)
  VALUES (p_member_id, p_citizen_id, p_citizen_name, p_citizen_avatar, 'active', v_now);

  -- Create turn
  INSERT INTO turns (
    member_id, session_id, citizen_id,
    chars_used, char_budget, messages_used, message_limit,
    expires_at
  ) VALUES (
    p_member_id, v_session_id, p_citizen_id,
    0, p_char_budget, 0, p_message_limit,
    v_now + (p_time_budget_seconds || ' seconds')::INTERVAL
  )
  RETURNING id INTO v_turn_id;

  RETURN QUERY SELECT 'turn_started'::TEXT, v_turn_id, v_session_id, 0, 0;
END;
$$ LANGUAGE plpgsql;
