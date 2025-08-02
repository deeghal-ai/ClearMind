-- User Feeds Table Schema (Clean Supabase-only version)
-- Stores both custom feeds and default feed preferences per user

CREATE TABLE IF NOT EXISTS user_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  feed_key text NOT NULL, -- e.g., "HackerNews AI/ML" or "custom_123456789"
  feed_name text NOT NULL,
  feed_url text NOT NULL,
  feed_category text DEFAULT 'custom',
  feed_description text,
  is_enabled boolean DEFAULT true,
  is_custom boolean DEFAULT false, -- true for user-added feeds, false for default feeds
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_feeds_user_id ON user_feeds(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feeds_enabled ON user_feeds(user_id, is_enabled);

-- Unique constraint to prevent duplicate feed keys per user
ALTER TABLE user_feeds ADD CONSTRAINT unique_user_feed_key UNIQUE (user_id, feed_key);

-- RLS (Row Level Security) policies
ALTER TABLE user_feeds ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own feeds
DROP POLICY IF EXISTS "Users can manage their own feeds" ON user_feeds;
CREATE POLICY "Users can manage their own feeds" ON user_feeds
  FOR ALL USING (auth.uid()::text = user_id);

-- Update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_feeds_updated_at ON user_feeds;
CREATE TRIGGER update_user_feeds_updated_at 
  BEFORE UPDATE ON user_feeds 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
