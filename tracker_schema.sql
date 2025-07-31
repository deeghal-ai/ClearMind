-- Day 5: Enhanced Tracker Database Schema
-- Run this complete script in your Supabase SQL Editor

-- Drop and recreate daily_logs with better structure
DROP TABLE IF EXISTS daily_logs CASCADE;

-- Enhanced daily tracking with more metrics
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  goals TEXT[] DEFAULT '{}',
  completed_goals TEXT[] DEFAULT '{}',
  learning_minutes INTEGER DEFAULT 0,
  focus_sessions INTEGER DEFAULT 0,
  mood TEXT CHECK (mood IN ('amazing', 'good', 'okay', 'struggling', NULL)),
  energy_level INTEGER CHECK (energy_level >= 1 AND energy_level <= 5),
  key_learning TEXT,
  reflection TEXT,
  roadmap_progress JSONB DEFAULT '{}', -- Track which roadmaps were worked on
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Streak tracking table
CREATE TABLE streak_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  total_days INTEGER DEFAULT 0,
  last_log_date DATE,
  streak_start_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Learning statistics aggregation
CREATE TABLE learning_stats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  week_of DATE NOT NULL, -- Monday of the week
  total_minutes INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  goals_completed INTEGER DEFAULT 0,
  goals_set INTEGER DEFAULT 0,
  avg_mood NUMERIC(2,1),
  avg_energy NUMERIC(2,1),
  most_active_day TEXT,
  roadmaps_touched TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, week_of)
);

-- Achievements/Milestones
CREATE TABLE achievements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  data JSONB DEFAULT '{}',
  UNIQUE(user_id, type)
);

-- Create indexes for better performance
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, date DESC);
CREATE INDEX idx_streak_data_user ON streak_data(user_id);
CREATE INDEX idx_learning_stats_user_week ON learning_stats(user_id, week_of DESC);
CREATE INDEX idx_achievements_user ON achievements(user_id, unlocked_at DESC);

-- Function to update streak data automatically
CREATE OR REPLACE FUNCTION update_streak_data()
RETURNS TRIGGER AS $$
DECLARE
  v_last_date DATE;
  v_current_streak INTEGER;
  v_gap_days INTEGER;
BEGIN
  -- Get current streak data
  SELECT last_log_date, current_streak 
  INTO v_last_date, v_current_streak
  FROM streak_data 
  WHERE user_id = NEW.user_id;
  
  -- If no streak data exists, create it
  IF NOT FOUND THEN
    INSERT INTO streak_data (user_id, current_streak, longest_streak, total_days, last_log_date, streak_start_date)
    VALUES (NEW.user_id, 1, 1, 1, NEW.date, NEW.date);
    RETURN NEW;
  END IF;
  
  -- Calculate gap between logs
  v_gap_days := NEW.date - v_last_date;
  
  -- Update streak based on gap
  IF v_gap_days = 0 THEN
    -- Same day update, no change to streak
    NULL;
  ELSIF v_gap_days = 1 THEN
    -- Consecutive day, increment streak
    UPDATE streak_data 
    SET current_streak = current_streak + 1,
        longest_streak = GREATEST(longest_streak, current_streak + 1),
        total_days = total_days + 1,
        last_log_date = NEW.date,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  ELSIF v_gap_days > 1 THEN
    -- Gap in streak, reset
    UPDATE streak_data 
    SET current_streak = 1,
        total_days = total_days + 1,
        last_log_date = NEW.date,
        streak_start_date = NEW.date,
        updated_at = NOW()
    WHERE user_id = NEW.user_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic streak updates
CREATE TRIGGER update_streak_trigger
AFTER INSERT OR UPDATE ON daily_logs
FOR EACH ROW
EXECUTE FUNCTION update_streak_data();

-- Function to calculate weekly statistics
CREATE OR REPLACE FUNCTION calculate_weekly_stats(p_user_id TEXT, p_date DATE)
RETURNS VOID AS $$
DECLARE
  v_week_start DATE;
  v_stats RECORD;
BEGIN
  -- Get Monday of the week
  v_week_start := date_trunc('week', p_date)::date;
  
  -- Calculate aggregated stats
  SELECT 
    SUM(learning_minutes) as total_minutes,
    SUM(focus_sessions) as total_sessions,
    SUM(array_length(completed_goals, 1)) as goals_completed,
    SUM(array_length(goals, 1)) as goals_set,
    AVG(CASE 
      WHEN mood = 'amazing' THEN 5
      WHEN mood = 'good' THEN 4
      WHEN mood = 'okay' THEN 3
      WHEN mood = 'struggling' THEN 2
      ELSE NULL
    END) as avg_mood,
    AVG(energy_level) as avg_energy,
    mode() WITHIN GROUP (ORDER BY date) as most_active_day,
    array_agg(DISTINCT jsonb_object_keys(roadmap_progress)) as roadmaps_touched
  INTO v_stats
  FROM daily_logs
  WHERE user_id = p_user_id
    AND date >= v_week_start
    AND date < v_week_start + INTERVAL '7 days';
  
  -- Upsert weekly stats
  INSERT INTO learning_stats (
    user_id, week_of, total_minutes, total_sessions, 
    goals_completed, goals_set, avg_mood, avg_energy, 
    most_active_day, roadmaps_touched
  )
  VALUES (
    p_user_id, v_week_start, 
    COALESCE(v_stats.total_minutes, 0),
    COALESCE(v_stats.total_sessions, 0),
    COALESCE(v_stats.goals_completed, 0),
    COALESCE(v_stats.goals_set, 0),
    v_stats.avg_mood,
    v_stats.avg_energy,
    v_stats.most_active_day,
    COALESCE(v_stats.roadmaps_touched, '{}')
  )
  ON CONFLICT (user_id, week_of)
  DO UPDATE SET
    total_minutes = EXCLUDED.total_minutes,
    total_sessions = EXCLUDED.total_sessions,
    goals_completed = EXCLUDED.goals_completed,
    goals_set = EXCLUDED.goals_set,
    avg_mood = EXCLUDED.avg_mood,
    avg_energy = EXCLUDED.avg_energy,
    most_active_day = EXCLUDED.most_active_day,
    roadmaps_touched = EXCLUDED.roadmaps_touched,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check and unlock achievements
CREATE OR REPLACE FUNCTION check_achievements(p_user_id TEXT)
RETURNS TABLE(new_achievements JSON[]) AS $$
DECLARE
  v_streak_data RECORD;
  v_total_stages INTEGER;
  v_new_achievements JSON[] := '{}';
BEGIN
  -- Get current data
  SELECT * INTO v_streak_data FROM streak_data WHERE user_id = p_user_id;
  
  -- First Log Achievement
  IF (SELECT COUNT(*) FROM daily_logs WHERE user_id = p_user_id) = 1 THEN
    INSERT INTO achievements (user_id, type, title, description)
    VALUES (p_user_id, 'first_log', '🎯 First Step', 'Logged your first learning day!')
    ON CONFLICT DO NOTHING;
    v_new_achievements := array_append(v_new_achievements, 
      '{"type":"first_log","title":"First Step","icon":"🎯"}'::json);
  END IF;
  
  -- Streak Achievements  
  IF v_streak_data.current_streak >= 7 THEN
    INSERT INTO achievements (user_id, type, title, description, data)
    VALUES (p_user_id, 'week_streak', '🔥 Week Warrior', 'Maintained a 7-day learning streak!', 
            jsonb_build_object('streak', v_streak_data.current_streak))
    ON CONFLICT DO NOTHING;
    v_new_achievements := array_append(v_new_achievements, 
      '{"type":"week_streak","title":"Week Warrior","icon":"🔥"}'::json);
  END IF;
  
  IF v_streak_data.current_streak >= 30 THEN
    INSERT INTO achievements (user_id, type, title, description, data)
    VALUES (p_user_id, 'month_streak', '📅 Monthly Master', 'Incredible 30-day learning streak!', 
            jsonb_build_object('streak', v_streak_data.current_streak))
    ON CONFLICT DO NOTHING;
    v_new_achievements := array_append(v_new_achievements, 
      '{"type":"month_streak","title":"Monthly Master","icon":"📅"}'::json);
  END IF;
  
  -- Goal Achievement Milestones
  IF (SELECT SUM(array_length(completed_goals, 1)) FROM daily_logs WHERE user_id = p_user_id) >= 50 THEN
    INSERT INTO achievements (user_id, type, title, description)
    VALUES (p_user_id, 'goal_master', '🎯 Goal Master', 'Completed 50+ learning goals!')
    ON CONFLICT DO NOTHING;
    v_new_achievements := array_append(v_new_achievements, 
      '{"type":"goal_master","title":"Goal Master","icon":"🎯"}'::json);
  END IF;
  
  -- Learning Time Milestones
  IF (SELECT SUM(learning_minutes) FROM daily_logs WHERE user_id = p_user_id) >= 600 THEN -- 10 hours
    INSERT INTO achievements (user_id, type, title, description)
    VALUES (p_user_id, 'time_champion', '⏰ Time Champion', 'Accumulated 10+ hours of learning!')
    ON CONFLICT DO NOTHING;
    v_new_achievements := array_append(v_new_achievements, 
      '{"type":"time_champion","title":"Time Champion","icon":"⏰"}'::json);
  END IF;

  RETURN QUERY SELECT v_new_achievements;
END;
$$ LANGUAGE plpgsql;

-- Insert some sample achievements for testing (optional)
-- You can remove this section if you don't want sample data
/*
INSERT INTO achievements (user_id, type, title, description) VALUES 
('sample_user', 'welcome', '👋 Welcome', 'Welcome to LearningOS!'),
('sample_user', 'first_goal', '🎯 First Goal', 'Set your first learning goal!')
ON CONFLICT DO NOTHING;
*/