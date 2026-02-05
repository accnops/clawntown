-- Town Database: Flexible indexed JSON storage

-- Generic data table
CREATE TABLE IF NOT EXISTS town_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  index_1 TEXT,
  index_2 TEXT,
  index_3 TEXT,
  data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX idx_town_data_type ON town_data(type);
CREATE INDEX idx_town_data_index_1 ON town_data(index_1) WHERE index_1 IS NOT NULL;
CREATE INDEX idx_town_data_index_2 ON town_data(index_2) WHERE index_2 IS NOT NULL;
CREATE INDEX idx_town_data_index_3 ON town_data(index_3) WHERE index_3 IS NOT NULL;
CREATE INDEX idx_town_data_created_at ON town_data(created_at);

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER town_data_updated_at
  BEFORE UPDATE ON town_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable realtime for town_data
ALTER PUBLICATION supabase_realtime ADD TABLE town_data;

-- Row level security
ALTER TABLE town_data ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Public read access" ON town_data
  FOR SELECT USING (true);

-- Insert/update only via service role (engine)
CREATE POLICY "Service role write access" ON town_data
  FOR ALL USING (auth.role() = 'service_role');
