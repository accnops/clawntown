-- Fix foreign key constraint on conversation_messages.citizen_id
-- to allow deleting citizens (and thus auth.users) without blocking
--
-- Currently: citizen_id UUID REFERENCES citizens(id) - no ON DELETE clause
-- After: citizen_id UUID REFERENCES citizens(id) ON DELETE SET NULL
--
-- This preserves conversation history but clears the citizen reference

-- Drop the existing constraint and add a new one with ON DELETE SET NULL
ALTER TABLE conversation_messages
DROP CONSTRAINT IF EXISTS conversation_messages_citizen_id_fkey;

ALTER TABLE conversation_messages
ADD CONSTRAINT conversation_messages_citizen_id_fkey
FOREIGN KEY (citizen_id) REFERENCES citizens(id) ON DELETE SET NULL;
