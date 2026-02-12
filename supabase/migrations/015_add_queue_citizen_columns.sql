-- Add denormalized citizen_name and citizen_avatar to queue_entries
-- (referenced by try_speak function in migration 014)
ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS citizen_name TEXT;
ALTER TABLE queue_entries ADD COLUMN IF NOT EXISTS citizen_avatar TEXT;
