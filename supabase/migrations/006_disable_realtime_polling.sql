-- Disable postgres_changes for tables that now use broadcast
-- We switched to server-side broadcasts for scalability (no thundering herd)

DO $$
BEGIN
  -- Drop queue_entries from publication if it exists there
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'queue_entries'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE queue_entries;
  END IF;

  -- Drop turns from publication if it exists there
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'turns'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE turns;
  END IF;

  -- Drop conversation_messages from publication if it exists there
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'conversation_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE conversation_messages;
  END IF;
END $$;
