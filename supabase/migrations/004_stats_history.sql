-- Stats history table for tracking metrics over time
-- Stores daily snapshots of GitHub and visitor stats

CREATE TABLE IF NOT EXISTS stats_history (
  id BIGSERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL UNIQUE,

  -- GitHub metrics
  contributors INTEGER NOT NULL DEFAULT 0,
  pull_requests INTEGER NOT NULL DEFAULT 0,
  commits INTEGER NOT NULL DEFAULT 0,
  stars INTEGER NOT NULL DEFAULT 0,

  -- Visitor metrics (daily unique visitors for that day)
  daily_visitors INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient date range queries
CREATE INDEX IF NOT EXISTS idx_stats_history_date ON stats_history(snapshot_date DESC);

-- Enable RLS
ALTER TABLE stats_history ENABLE ROW LEVEL SECURITY;

-- Allow insert/update from service role only (cron job)
CREATE POLICY "Service role can manage stats_history"
  ON stats_history
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Allow public read access (stats are public)
CREATE POLICY "Public can read stats_history"
  ON stats_history
  FOR SELECT
  TO anon
  USING (true);
