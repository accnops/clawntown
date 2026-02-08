-- Visitors table for privacy-respecting analytics
-- Stores hashed IP + date combinations for unique daily visitor counts
-- No personal data is stored

CREATE TABLE IF NOT EXISTS visitors (
  id BIGSERIAL PRIMARY KEY,
  visitor_hash VARCHAR(16) NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint on hash + date (one count per visitor per day)
  UNIQUE(visitor_hash, visit_date)
);

-- Index for efficient date-based queries
CREATE INDEX IF NOT EXISTS idx_visitors_date ON visitors(visit_date);

-- Enable RLS
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;

-- Allow insert from service role only (API routes)
CREATE POLICY "Service role can insert visitors"
  ON visitors
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow select from service role only
CREATE POLICY "Service role can read visitors"
  ON visitors
  FOR SELECT
  TO service_role
  USING (true);
