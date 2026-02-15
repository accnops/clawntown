-- Rate limiting table for tracking request counts per IP per endpoint
CREATE TABLE IF NOT EXISTS rate_limits (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', NOW()),
  request_count INT NOT NULL DEFAULT 1,
  UNIQUE(ip_hash, endpoint, window_start)
);

-- Index for efficient lookups (descending window_start for cleanup queries)
CREATE INDEX IF NOT EXISTS idx_rate_limits_lookup
  ON rate_limits(ip_hash, endpoint, window_start DESC);

-- Cleanup function for old entries (called by cron)
-- Retains 1 hour of data to support rate limit windows up to 60 minutes
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM rate_limits WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atomic rate limit check and increment
-- Uses fixed 1-minute windows; p_window_minutes only affects reset_at for client display
-- Returns: allowed (bool), remaining (int), reset_at (timestamptz)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_ip_hash TEXT,
  p_endpoint TEXT,
  p_limit INT DEFAULT 10,
  p_window_minutes INT DEFAULT 1
)
RETURNS TABLE(allowed BOOLEAN, remaining INT, reset_at TIMESTAMPTZ) AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_count INT;
BEGIN
  -- Calculate current window start (truncate to minute)
  v_window_start := date_trunc('minute', NOW());

  -- Upsert and get current count atomically
  INSERT INTO rate_limits (ip_hash, endpoint, window_start, request_count)
  VALUES (p_ip_hash, p_endpoint, v_window_start, 1)
  ON CONFLICT (ip_hash, endpoint, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_count;

  RETURN QUERY SELECT
    v_count <= p_limit,
    GREATEST(0, p_limit - v_count),
    v_window_start + (p_window_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: Only service role can access
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON rate_limits
  FOR ALL USING (auth.role() = 'service_role');
