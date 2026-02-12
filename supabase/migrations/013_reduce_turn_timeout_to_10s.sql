-- Reduce turn timeout from 20s to 10s in progress_queue function

CREATE OR REPLACE FUNCTION progress_queue(
  p_member_id TEXT,
  p_citizen_id UUID,
  p_heartbeat_stale_seconds INT DEFAULT 180
) RETURNS TABLE (
  action TEXT,
  turn_id UUID,
  turn_started BOOLEAN,
  queue_position INT,
  queue_length INT,
  next_heartbeat_ms INT
) AS $$
DECLARE
  v_current_turn RECORD;
  v_next_entry RECORD;
  v_my_entry RECORD;
  v_position INT;
  v_queue_len INT;
  v_session_id UUID;
  v_now TIMESTAMPTZ := now();
  v_stale_cutoff TIMESTAMPTZ := v_now - (p_heartbeat_stale_seconds || ' seconds')::INTERVAL;
BEGIN
  -- Lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('queue_progress_' || p_member_id::TEXT));

  -- 1. Update caller's heartbeat
  UPDATE queue_entries
  SET last_heartbeat_at = v_now
  WHERE member_id = p_member_id
    AND citizen_id = p_citizen_id
    AND status IN ('waiting', 'ready_check', 'confirmed');

  -- 2. Check for expired turn and end it
  SELECT * INTO v_current_turn
  FROM turns
  WHERE member_id = p_member_id AND ended_at IS NULL
  FOR UPDATE;

  IF v_current_turn IS NOT NULL AND v_current_turn.expires_at < v_now THEN
    -- End the expired turn
    UPDATE turns SET ended_at = v_now WHERE id = v_current_turn.id;

    -- Mark their queue entry as completed
    UPDATE queue_entries
    SET status = 'completed'
    WHERE member_id = p_member_id
      AND citizen_id = v_current_turn.citizen_id
      AND status = 'active';

    v_current_turn := NULL;
  END IF;

  -- 3. If no active turn, try to start the next person's turn
  IF v_current_turn IS NULL THEN
    -- Skip stale entries
    UPDATE queue_entries
    SET status = 'skipped'
    WHERE member_id = p_member_id
      AND status = 'waiting'
      AND (last_heartbeat_at IS NULL OR last_heartbeat_at < v_stale_cutoff);

    -- Get next valid entry
    SELECT * INTO v_next_entry
    FROM queue_entries
    WHERE member_id = p_member_id
      AND status = 'waiting'
      AND last_heartbeat_at >= v_stale_cutoff
    ORDER BY joined_at ASC
    LIMIT 1
    FOR UPDATE;

    IF v_next_entry IS NOT NULL THEN
      -- Get or create session
      SELECT id INTO v_session_id
      FROM conversation_sessions
      WHERE member_id = p_member_id AND status = 'active';

      IF v_session_id IS NULL THEN
        INSERT INTO conversation_sessions (member_id, status)
        VALUES (p_member_id, 'active')
        RETURNING id INTO v_session_id;
      END IF;

      -- Start their turn (10 seconds timeout, 1 message, 256 chars)
      INSERT INTO turns (
        member_id, session_id, citizen_id,
        chars_used, char_budget, messages_used, message_limit,
        expires_at
      ) VALUES (
        p_member_id, v_session_id, v_next_entry.citizen_id,
        0, 256, 0, 1,
        v_now + interval '10 seconds'
      )
      RETURNING id INTO v_current_turn.id;

      -- Update queue entry to active
      UPDATE queue_entries
      SET status = 'active'
      WHERE id = v_next_entry.id;

      -- Check if this is the caller
      IF v_next_entry.citizen_id = p_citizen_id THEN
        RETURN QUERY SELECT
          'turn_started'::TEXT,
          v_current_turn.id,
          true,
          0,
          (SELECT COUNT(*)::INT FROM queue_entries WHERE member_id = p_member_id AND status = 'waiting'),
          5000;  -- 5s heartbeat when you have the turn
        RETURN;
      END IF;
    END IF;
  END IF;

  -- 4. Calculate caller's position and recommended heartbeat interval
  SELECT COUNT(*)::INT INTO v_position
  FROM queue_entries
  WHERE member_id = p_member_id
    AND status = 'waiting'
    AND joined_at < (
      SELECT joined_at FROM queue_entries
      WHERE member_id = p_member_id AND citizen_id = p_citizen_id AND status = 'waiting'
    );

  -- Check if caller is in queue
  SELECT * INTO v_my_entry
  FROM queue_entries
  WHERE member_id = p_member_id
    AND citizen_id = p_citizen_id
    AND status IN ('waiting', 'active');

  IF v_my_entry IS NULL THEN
    RETURN QUERY SELECT
      'not_in_queue'::TEXT,
      NULL::UUID,
      false,
      NULL::INT,
      (SELECT COUNT(*)::INT FROM queue_entries WHERE member_id = p_member_id AND status = 'waiting'),
      NULL::INT;
    RETURN;
  END IF;

  IF v_my_entry.status = 'active' THEN
    RETURN QUERY SELECT
      'has_turn'::TEXT,
      v_current_turn.id,
      false,
      0,
      (SELECT COUNT(*)::INT FROM queue_entries WHERE member_id = p_member_id AND status = 'waiting'),
      60000;  -- Heartbeat less important when you have the turn
    RETURN;
  END IF;

  -- Calculate heartbeat interval based on position
  v_queue_len := (SELECT COUNT(*)::INT FROM queue_entries WHERE member_id = p_member_id AND status = 'waiting');

  RETURN QUERY SELECT
    'waiting'::TEXT,
    NULL::UUID,
    false,
    v_position,
    v_queue_len,
    CASE
      WHEN v_position = 0 THEN 5000     -- 5s - next up
      WHEN v_position <= 2 THEN 30000   -- 30s
      WHEN v_position <= 5 THEN 60000   -- 1 min
      ELSE 240000                        -- 4 min cap
    END;
END;
$$ LANGUAGE plpgsql;
