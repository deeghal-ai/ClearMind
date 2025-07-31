-- Fixed version 2: Corrected the conflict resolution issue
-- Run this in your Supabase SQL Editor

DROP TRIGGER IF EXISTS update_roadmap_progress_trigger ON user_progress;
DROP FUNCTION IF EXISTS update_roadmap_progress();

-- Fixed function with proper variable scoping
CREATE OR REPLACE FUNCTION update_roadmap_progress()
RETURNS TRIGGER AS $$
DECLARE
  actual_total_stages INTEGER;
  actual_completed_count INTEGER;
BEGIN
  -- Get the actual number of stages from the roadmap
  SELECT jsonb_array_length(stages)
  INTO actual_total_stages
  FROM roadmaps
  WHERE id = NEW.roadmap_id;
  
  -- Count completed stages for this user and roadmap
  SELECT COUNT(*) FILTER (WHERE completed = true)
  INTO actual_completed_count
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
    actual_completed_count,
    actual_total_stages,
    NOW(),
    actual_completed_count = actual_total_stages,
    CASE WHEN actual_completed_count = actual_total_stages THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, roadmap_id)
  DO UPDATE SET
    completed_stages = actual_completed_count,
    total_stages = actual_total_stages,
    last_activity = NOW(),
    is_completed = actual_completed_count = actual_total_stages,
    completed_at = CASE WHEN actual_completed_count = actual_total_stages THEN NOW() ELSE NULL END;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER update_roadmap_progress_trigger
AFTER INSERT OR UPDATE ON user_progress
FOR EACH ROW
EXECUTE FUNCTION update_roadmap_progress();