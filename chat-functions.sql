-- Additional SQL functions needed for chat functionality
-- Run this in your Supabase SQL editor after running chat-schema.sql

-- Function to increment numeric columns (for token counting)
CREATE OR REPLACE FUNCTION increment(
  table_name text,
  column_name text,
  row_id uuid,
  amount integer DEFAULT 1
)
RETURNS void AS $$
BEGIN
  IF table_name = 'chat_sessions' AND column_name = 'total_tokens' THEN
    UPDATE chat_sessions 
    SET total_tokens = total_tokens + amount
    WHERE id = row_id;
  ELSIF table_name = 'saved_prompts' AND column_name = 'usage_count' THEN
    UPDATE saved_prompts 
    SET usage_count = usage_count + amount
    WHERE id = row_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;