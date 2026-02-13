-- Add unique constraint to prevent same user being in queue twice for same council member
-- Only applies to active queue entries (waiting or active status)

-- Drop the old non-unique index
DROP INDEX IF EXISTS idx_queue_member_citizen;

-- Create a unique partial index for active queue entries only
CREATE UNIQUE INDEX idx_queue_member_citizen_active
  ON queue_entries(member_id, citizen_id)
  WHERE status IN ('waiting', 'active');
