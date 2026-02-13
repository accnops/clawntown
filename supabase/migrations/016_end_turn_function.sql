-- Batched end_turn function to reduce network round trips
-- Combines: update turn, update queue entry, get queue length
CREATE OR REPLACE FUNCTION end_turn_batch(
  p_turn_id UUID,
  p_citizen_id UUID,
  p_member_id TEXT,
  p_messages_used INT,
  p_chars_used INT
)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
  v_queue_length INT;
BEGIN
  -- Update turn
  UPDATE turns
  SET
    messages_used = p_messages_used,
    chars_used = p_chars_used,
    ended_at = NOW()
  WHERE id = p_turn_id;

  -- Mark queue entry as completed
  UPDATE queue_entries
  SET status = 'completed'
  WHERE citizen_id = p_citizen_id
    AND member_id = p_member_id
    AND status = 'active';

  -- Get queue length
  SELECT COUNT(*)::INT INTO v_queue_length
  FROM queue_entries
  WHERE member_id = p_member_id
    AND status = 'waiting';

  RETURN v_queue_length;
END;
$$;
