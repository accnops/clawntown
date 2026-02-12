-- Add forks and citizens columns to stats_history for full sparkline coverage
-- These columns track GitHub forks (sister towns) and registered citizen count over time

ALTER TABLE stats_history
ADD COLUMN IF NOT EXISTS forks INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS citizens INTEGER DEFAULT 0;

-- Backfill existing rows with 0 (they'll get real values on next cron run)
UPDATE stats_history SET forks = 0 WHERE forks IS NULL;
UPDATE stats_history SET citizens = 0 WHERE citizens IS NULL;
