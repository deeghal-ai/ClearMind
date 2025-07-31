-- Enhanced chat schema for Day 4 implementation
-- Run this in your Supabase SQL editor

-- Drop existing tables to rebuild with better structure
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;
DROP TABLE IF EXISTS saved_prompts CASCADE;

-- Enhanced chat sessions with better context handling
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT,
  context_type TEXT CHECK (context_type IN ('general', 'roadmap', 'feeds', 'mixed')),
  context_data JSONB DEFAULT '{}',
  model TEXT DEFAULT 'gpt-4-turbo-preview',
  total_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced messages with token tracking
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved prompts for quick access
CREATE TABLE saved_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, created_at DESC);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX idx_saved_prompts_user ON saved_prompts(user_id, usage_count DESC);

-- Function to generate chat title from first message
CREATE OR REPLACE FUNCTION generate_chat_title()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'user' AND EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE id = NEW.session_id AND title IS NULL
  ) THEN
    UPDATE chat_sessions 
    SET title = LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
        updated_at = NOW()
    WHERE id = NEW.session_id;
  END IF;
  
  -- Update session timestamp
  UPDATE chat_sessions 
  SET updated_at = NOW() 
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_chat_title_trigger
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION generate_chat_title();

-- Insert default saved prompts
INSERT INTO saved_prompts (user_id, title, prompt, category) VALUES
('default', 'Explain Like I''m 5', 'Can you explain this concept as if I were 5 years old?', 'learning'),
('default', 'Real-World Example', 'Can you provide a real-world example of how this is used?', 'learning'),
('default', 'Common Mistakes', 'What are the most common mistakes people make with this?', 'learning'),
('default', 'Best Practices', 'What are the current best practices for this?', 'technical'),
('default', 'Debug Help', 'I''m getting this error. Can you help me debug it?', 'technical'),
('default', 'Code Review', 'Can you review this code and suggest improvements?', 'technical'),
('default', 'Learning Path', 'What should I learn next after mastering this?', 'roadmap'),
('default', 'Project Ideas', 'Can you suggest some project ideas to practice this concept?', 'roadmap');