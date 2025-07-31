-- Fix the progress tracking trigger to use actual roadmap stage count
-- Run this in your Supabase SQL Editor

DROP TRIGGER IF EXISTS update_roadmap_progress_trigger ON user_progress;
DROP FUNCTION IF EXISTS update_roadmap_progress();

-- Fixed function to get total stages from roadmap definition
CREATE OR REPLACE FUNCTION update_roadmap_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_stages INTEGER;
  completed_count INTEGER;
BEGIN
  -- Get the actual number of stages from the roadmap
  SELECT jsonb_array_length(stages)
  INTO total_stages
  FROM roadmaps
  WHERE id = NEW.roadmap_id;
  
  -- Count completed stages for this user and roadmap
  SELECT COUNT(*) FILTER (WHERE completed = true)
  INTO completed_count
  FROM user_progress
  WHERE user_id = NEW.user_id AND roadmap_id = NEW.roadmap_id;
  
  -- Update or insert roadmap progress
  INSERT INTO roadmap_progress (
    user_id, 
    roadmap_id, 
    completed_stages, 
    total_stages,
    last_activity,
    is_completed,
    completed_at
  )
  VALUES (
    NEW.user_id,
    NEW.roadmap_id,
    completed_count,
    total_stages,
    NOW(),
    completed_count = total_stages,
    CASE WHEN completed_count = total_stages THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, roadmap_id)
  DO UPDATE SET
    completed_stages = completed_count,
    total_stages = total_stages,
    last_activity = NOW(),
    is_completed = completed_count = total_stages,
    completed_at = CASE WHEN completed_count = total_stages THEN NOW() ELSE NULL END;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_roadmap_progress_trigger
AFTER INSERT OR UPDATE ON user_progress
FOR EACH ROW
EXECUTE FUNCTION update_roadmap_progress();

-- Fix existing data: Update all roadmap_progress records with correct total_stages
UPDATE roadmap_progress 
SET total_stages = (
  SELECT jsonb_array_length(stages)
  FROM roadmaps 
  WHERE roadmaps.id = roadmap_progress.roadmap_id
),
completed_stages = (
  SELECT COUNT(*) FILTER (WHERE completed = true)
  FROM user_progress
  WHERE user_progress.user_id = roadmap_progress.user_id 
    AND user_progress.roadmap_id = roadmap_progress.roadmap_id
),
is_completed = (
  SELECT COUNT(*) FILTER (WHERE completed = true)
  FROM user_progress
  WHERE user_progress.user_id = roadmap_progress.user_id 
    AND user_progress.roadmap_id = roadmap_progress.roadmap_id
) = (
  SELECT jsonb_array_length(stages)
  FROM roadmaps 
  WHERE roadmaps.id = roadmap_progress.roadmap_id
);