-- Add citizen_avatar to conversation_messages (denormalized for display, like citizen_name)
ALTER TABLE conversation_messages ADD COLUMN IF NOT EXISTS citizen_avatar TEXT;
