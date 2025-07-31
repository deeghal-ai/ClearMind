# Day 5: Daily Tracker & Final Polish - Complete Step-by-Step Guide

## Morning Setup (30 minutes)

### Step 1: Verify Day 4 Completion
```bash
# Start your dev server
npm run dev

# Verify all features work:
# - Feeds are loading
# - Roadmap progress tracking works
# - AI chat with context is functional
# Ensure no console errors
```

### Step 2: Enhance Tracker Schema
Run this in your Supabase SQL editor:
```sql
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

-- Create indexes
CREATE INDEX idx_daily_logs_user_date ON daily_logs(user_id, date DESC);
CREATE INDEX idx_streak_data_user ON streak_data(user_id);
CREATE INDEX idx_learning_stats_user_week ON learning_stats(user_id, week_of DESC);
CREATE INDEX idx_achievements_user ON achievements(user_id, unlocked_at DESC);

-- Function to update streak data
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

-- Create trigger for streak updates
CREATE TRIGGER update_streak_trigger
AFTER INSERT OR UPDATE ON daily_logs
FOR EACH ROW
EXECUTE FUNCTION update_streak_data();

-- Function to calculate weekly stats
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
  END IF;
  
  IF v_streak_data.current_streak >= 30 THEN
    INSERT INTO achievements (user_id, type, title, description, data)
    VALUES (p_user_id, 'month_streak', '💪 Monthly Master', 'Incredible 30-day learning streak!',
            jsonb_build_object('streak', v_streak_data.current_streak))
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Total days achievements
  IF v_streak_data.total_days >= 50 THEN
    INSERT INTO achievements (user_id, type, title, description, data)
    VALUES (p_user_id, 'dedicated_learner', '🏆 Dedicated Learner', 'Logged 50 total learning days!',
            jsonb_build_object('total_days', v_streak_data.total_days))
    ON CONFLICT DO NOTHING;
  END IF;
  
  RETURN QUERY SELECT v_new_achievements;
END;
$$ LANGUAGE plpgsql;

-- Sample data for testing
INSERT INTO achievements (user_id, type, title, description) VALUES
('default', 'welcome', '👋 Welcome', 'Started your learning journey with LearningOS');
```

## Build Core Tracker Components (1.5 hours)

### Step 3: Create Tracker Store
Create `src/lib/stores/tracker.js`:
```javascript
import { writable, derived } from 'svelte/store';
import { supabase } from '$lib/supabase';

function createTrackerStore() {
  const { subscribe, set, update } = writable({
    todayLog: null,
    streak: null,
    weeklyStats: null,
    achievements: [],
    recentLogs: [],
    loading: false,
    error: null
  });

  return {
    subscribe,
    
    async loadTodayLog(userId) {
      const today = new Date().toISOString().split('T')[0];
      
      try {
        const { data, error } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', userId)
          .eq('date', today)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error; // Ignore not found
        
        update(s => ({ ...s, todayLog: data }));
        return data;
      } catch (error) {
        update(s => ({ ...s, error: error.message }));
        return null;
      }
    },
    
    async saveTodayLog(userId, logData) {
      const today = new Date().toISOString().split('T')[0];
      
      try {
        const { data, error } = await supabase
          .from('daily_logs')
          .upsert({
            user_id: userId,
            date: today,
            ...logData,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,date'
          })
          .select()
          .single();
        
        if (error) throw error;
        
        update(s => ({ ...s, todayLog: data }));
        
        // Check for new achievements
        await this.checkAchievements(userId);
        
        // Update weekly stats
        await supabase.rpc('calculate_weekly_stats', {
          p_user_id: userId,
          p_date: today
        });
        
        return data;
      } catch (error) {
        update(s => ({ ...s, error: error.message }));
        return null;
      }
    },
    
    async loadStreak(userId) {
      try {
        const { data, error } = await supabase
          .from('streak_data')
          .select('*')
          .eq('user_id', userId)
          .single();
        
        if (error && error.code !== 'PGRST116') throw error;
        
        update(s => ({ ...s, streak: data }));
        return data;
      } catch (error) {
        update(s => ({ ...s, error: error.message }));
        return null;
      }
    },
    
    async loadWeeklyStats(userId) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); // Monday
      
      try {
        const { data, error } = await supabase
          .from('learning_stats')
          .select('*')
          .eq('user_id', userId)
          .gte('week_of', weekStart.toISOString().split('T')[0])
          .order('week_of', { ascending: false })
          .limit(4); // Last 4 weeks
        
        if (error) throw error;
        
        update(s => ({ ...s, weeklyStats: data }));
        return data;
      } catch (error) {
        update(s => ({ ...s, error: error.message }));
        return null;
      }
    },
    
    async loadRecentLogs(userId, days = 7) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      try {
        const { data, error } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', userId)
          .gte('date', startDate.toISOString().split('T')[0])
          .order('date', { ascending: false });
        
        if (error) throw error;
        
        update(s => ({ ...s, recentLogs: data }));
        return data;
      } catch (error) {
        update(s => ({ ...s, error: error.message }));
        return null;
      }
    },
    
    async loadAchievements(userId) {
      try {
        const { data, error } = await supabase
          .from('achievements')
          .select('*')
          .eq('user_id', userId)
          .order('unlocked_at', { ascending: false });
        
        if (error) throw error;
        
        update(s => ({ ...s, achievements: data }));
        return data;
      } catch (error) {
        update(s => ({ ...s, error: error.message }));
        return null;
      }
    },
    
    async checkAchievements(userId) {
      try {
        const { data, error } = await supabase
          .rpc('check_achievements', { p_user_id: userId });
        
        if (error) throw error;
        
        // Reload achievements if new ones were unlocked
        if (data && data.length > 0) {
          await this.loadAchievements(userId);
          return data;
        }
        
        return [];
      } catch (error) {
        console.error('Error checking achievements:', error);
        return [];
      }
    },
    
    async loadAll(userId) {
      update(s => ({ ...s, loading: true }));
      
      try {
        await Promise.all([
          this.loadTodayLog(userId),
          this.loadStreak(userId),
          this.loadWeeklyStats(userId),
          this.loadRecentLogs(userId),
          this.loadAchievements(userId)
        ]);
      } finally {
        update(s => ({ ...s, loading: false }));
      }
    }
  };
}

export const trackerStore = createTrackerStore();

// Derived stores for computed values
export const streakStatus = derived(trackerStore, $store => {
  if (!$store.streak) return { hasStreak: false, message: 'Start your streak today!' };
  
  const { current_streak, last_log_date } = $store.streak;
  const today = new Date().toISOString().split('T')[0];
  const lastLog = new Date(last_log_date);
  const daysSinceLastLog = Math.floor((new Date() - lastLog) / (1000 * 60 * 60 * 24));
  
  if (daysSinceLastLog === 0) {
    return {
      hasStreak: true,
      current: current_streak,
      message: `${current_streak} day streak! Keep it up! 🔥`
    };
  } else if (daysSinceLastLog === 1) {
    return {
      hasStreak: true,
      current: current_streak,
      message: `Log today to continue your ${current_streak} day streak!`
    };
  } else {
    return {
      hasStreak: false,
      message: 'Your streak has ended. Start a new one today!'
    };
  }
});
```

### Step 4: Create Goal Input Component
Create `src/lib/components/GoalInput.svelte`:
```svelte
<script>
  import { createEventDispatcher } from 'svelte';
  
  export let goals = [];
  export let completedGoals = [];
  
  const dispatch = createEventDispatcher();
  
  let newGoal = '';
  let editingIndex = null;
  let editValue = '';
  
  function addGoal() {
    if (!newGoal.trim()) return;
    
    goals = [...goals, newGoal.trim()];
    newGoal = '';
    dispatch('update', { goals, completedGoals });
  }
  
  function removeGoal(index) {
    goals = goals.filter((_, i) => i !== index);
    completedGoals = completedGoals.filter(g => g !== goals[index]);
    dispatch('update', { goals, completedGoals });
  }
  
  function toggleGoal(goal) {
    if (completedGoals.includes(goal)) {
      completedGoals = completedGoals.filter(g => g !== goal);
    } else {
      completedGoals = [...completedGoals, goal];
    }
    dispatch('update', { goals, completedGoals });
  }
  
  function startEdit(index) {
    editingIndex = index;
    editValue = goals[index];
  }
  
  function saveEdit() {
    if (editValue.trim()) {
      goals[editingIndex] = editValue.trim();
      goals = goals;
    }
    editingIndex = null;
    editValue = '';
    dispatch('update', { goals, completedGoals });
  }
  
  function handleKeypress(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingIndex !== null) {
        saveEdit();
      } else {
        addGoal();
      }
    } else if (e.key === 'Escape' && editingIndex !== null) {
      editingIndex = null;
      editValue = '';
    }
  }
</script>

<div class="space-y-4">
  <div>
    <label class="block text-sm font-medium text-zen-gray-700 mb-2">
      Today's Learning Goals
    </label>
    
    <!-- Goal Input -->
    <form on:submit|preventDefault={addGoal} class="flex gap-2">
      <input
        bind:value={newGoal}
        on:keydown={handleKeypress}
        type="text"
        placeholder="Add a learning goal..."
        class="flex-1 px-3 py-2 border border-zen-gray-300 rounded-lg 
               focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      <button
        type="submit"
        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600
               transition-colors"
      >
        Add
      </button>
    </form>
  </div>
  
  <!-- Goals List -->
  {#if goals.length > 0}
    <div class="space-y-2">
      {#each goals as goal, index}
        {@const isCompleted = completedGoals.includes(goal)}
        <div class="flex items-center gap-2 p-3 bg-zen-gray-50 rounded-lg group">
          <input
            type="checkbox"
            checked={isCompleted}
            on:change={() => toggleGoal(goal)}
            class="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
          />
          
          {#if editingIndex === index}
            <input
              bind:value={editValue}
              on:keydown={handleKeypress}
              on:blur={saveEdit}
              class="flex-1 px-2 py-1 border border-blue-500 rounded"
              autofocus
            />
          {:else}
            <span 
              class="flex-1 {isCompleted ? 'line-through text-zen-gray-500' : ''}"
              on:dblclick={() => startEdit(index)}
            >
              {goal}
            </span>
          {/if}
          
          <button
            on:click={() => removeGoal(index)}
            class="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-600
                   transition-opacity"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/each}
      
      <div class="text-sm text-zen-gray-600 text-center">
        {completedGoals.length} of {goals.length} completed
        {#if completedGoals.length === goals.length && goals.length > 0}
          <span class="ml-2">🎉</span>
        {/if}
      </div>
    </div>
  {:else}
    <p class="text-center text-zen-gray-500 text-sm py-4">
      No goals yet. Add one to get started!
    </p>
  {/if}
</div>

<style>
  input[type="checkbox"]:checked + span {
    animation: strikethrough 0.3s ease-out;
  }
  
  @keyframes strikethrough {
    from {
      text-decoration-color: transparent;
    }
    to {
      text-decoration-color: currentColor;
    }
  }
</style>
```

### Step 5: Create Mood/Energy Tracker
Create `src/lib/components/MoodEnergyTracker.svelte`:
```svelte
<script>
  import { createEventDispatcher } from 'svelte';
  
  export let mood = null;
  export let energyLevel = null;
  
  const dispatch = createEventDispatcher();
  
  const moods = [
    { value: 'struggling', emoji: '😔', label: 'Struggling' },
    { value: 'okay', emoji: '😐', label: 'Okay' },
    { value: 'good', emoji: '🙂', label: 'Good' },
    { value: 'amazing', emoji: '😄', label: 'Amazing' }
  ];
  
  function setMood(value) {
    mood = value;
    dispatch('update', { mood, energyLevel });
  }
  
  function setEnergy(value) {
    energyLevel = value;
    dispatch('update', { mood, energyLevel });
  }
</script>

<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
  <!-- Mood Tracker -->
  <div>
    <label class="block text-sm font-medium text-zen-gray-700 mb-3">
      How are you feeling today?
    </label>
    <div class="flex justify-between gap-2">
      {#each moods as moodOption}
        <button
          on:click={() => setMood(moodOption.value)}
          class="flex-1 p-3 rounded-lg border-2 transition-all
                 {mood === moodOption.value 
                   ? 'border-blue-500 bg-blue-50' 
                   : 'border-zen-gray-200 hover:border-zen-gray-300'}"
        >
          <div class="text-3xl mb-1">{moodOption.emoji}</div>
          <div class="text-xs">{moodOption.label}</div>
        </button>
      {/each}
    </div>
  </div>
  
  <!-- Energy Level -->
  <div>
    <label class="block text-sm font-medium text-zen-gray-700 mb-3">
      Energy level
    </label>
    <div class="flex items-center gap-3">
      <span class="text-2xl">🔋</span>
      <div class="flex-1 flex gap-1">
        {#each [1, 2, 3, 4, 5] as level}
          <button
            on:click={() => setEnergy(level)}
            class="flex-1 h-8 rounded transition-all
                   {energyLevel >= level 
                     ? 'bg-green-500' 
                     : 'bg-zen-gray-200 hover:bg-zen-gray-300'}"
            title="{level} out of 5"
          />
        {/each}
      </div>
      <span class="text-sm text-zen-gray-600 w-8">
        {energyLevel || 0}/5
      </span>
    </div>
  </div>
</div>
```

### Step 6: Create Calendar Heatmap
Create `src/lib/components/CalendarHeatmap.svelte`:
```svelte
<script>
  import { onMount } from 'svelte';
  
  export let logs = [];
  export let year = new Date().getFullYear();
  
  let weeks = [];
  const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  
  onMount(() => {
    generateCalendar();
  });
  
  function generateCalendar() {
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    // Adjust start to previous Sunday
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // Create log map for quick lookup
    const logMap = new Map();
    logs.forEach(log => {
      logMap.set(log.date, log);
    });
    
    // Generate weeks
    weeks = [];
    let currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        const log = logMap.get(dateStr);
        
        week.push({
          date: new Date(currentDate),
          dateStr,
          log,
          intensity: getIntensity(log),
          isCurrentMonth: currentDate.getMonth() === new Date().getMonth() && 
                         currentDate.getFullYear() === new Date().getFullYear()
        });
        
        currentDate.setDate(currentDate.getDate() + 1);
      }
      weeks.push(week);
    }
  }
  
  function getIntensity(log) {
    if (!log) return 0;
    
    const goalsCompleted = log.completed_goals?.length || 0;
    const totalGoals = log.goals?.length || 0;
    const minutes = log.learning_minutes || 0;
    
    if (totalGoals === 0 && minutes === 0) return 0;
    
    const completionRate = totalGoals > 0 ? goalsCompleted / totalGoals : 0;
    const timeScore = Math.min(minutes / 120, 1); // 2 hours = max
    
    const score = (completionRate * 0.6 + timeScore * 0.4);
    
    if (score >= 0.8) return 4;
    if (score >= 0.6) return 3;
    if (score >= 0.4) return 2;
    if (score > 0) return 1;
    return 0;
  }
  
  function getColor(intensity) {
    const colors = [
      'bg-zen-gray-100',      // No activity
      'bg-green-200',         // Low
      'bg-green-400',         // Medium
      'bg-green-600',         // High
      'bg-green-800'          // Very high
    ];
    return colors[intensity];
  }
  
  function formatTooltip(day) {
    if (!day.log) return `${day.dateStr}: No activity`;
    
    const { completed_goals, goals, learning_minutes } = day.log;
    const completed = completed_goals?.length || 0;
    const total = goals?.length || 0;
    
    return `${day.dateStr}
Goals: ${completed}/${total} completed
Time: ${learning_minutes || 0} minutes
Mood: ${day.log.mood || 'Not tracked'}`;
  }
  
  $: if (logs) generateCalendar();
</script>

<div class="overflow-x-auto">
  <div class="inline-block">
    <!-- Month labels -->
    <div class="flex mb-2 ml-10">
      {#each monthLabels as month, i}
        <div 
          class="text-xs text-zen-gray-600"
          style="width: {weeks.filter(w => w[0].date.getMonth() === i).length * 12}px"
        >
          {month}
        </div>
      {/each}
    </div>
    
    <div class="flex">
      <!-- Day labels -->
      <div class="flex flex-col mr-2">
        {#each dayLabels as day, i}
          <div class="text-xs text-zen-gray-600 h-3 flex items-center">
            {i % 2 === 1 ? day : ''}
          </div>
        {/each}
      </div>
      
      <!-- Calendar grid -->
      <div class="flex gap-1">
        {#each weeks as week}
          <div class="flex flex-col gap-1">
            {#each week as day}
              <div
                class="w-3 h-3 rounded-sm cursor-pointer transition-all
                       {getColor(day.intensity)}
                       {day.isCurrentMonth ? 'ring-1 ring-blue-400' : ''}
                       hover:ring-2 hover:ring-blue-500"
                title={formatTooltip(day)}
              />
            {/each}
          </div>
        {/each}
      </div>
    </div>
    
    <!-- Legend -->
    <div class="flex items-center gap-4 mt-4 text-xs text-zen-gray-600">
      <span>Less</span>
      <div class="flex gap-1">
        {#each [0, 1, 2, 3, 4] as intensity}
          <div class="w-3 h-3 rounded-sm {getColor(intensity)}" />
        {/each}
      </div>
      <span>More</span>
    </div>
  </div>
</div>
```

### Step 7: Create Analytics Dashboard
Create `src/lib/components/LearningAnalytics.svelte`:
```svelte
<script>
  import { onMount } from 'svelte';
  
  export let weeklyStats = [];
  export let recentLogs = [];
  export let streak = null;
  
  let selectedMetric = 'minutes';
  let chartContainer;
  
  const metrics = [
    { id: 'minutes', label: 'Learning Time', unit: 'min' },
    { id: 'goals', label: 'Goals Completed', unit: '' },
    { id: 'mood', label: 'Average Mood', unit: '/5' },
    { id: 'energy', label: 'Energy Level', unit: '/5' }
  ];
  
  function getMetricData(metric) {
    if (!weeklyStats.length) return [];
    
    return weeklyStats.map(week => {
      const value = metric === 'minutes' ? week.total_minutes :
                   metric === 'goals' ? week.goals_completed :
                   metric === 'mood' ? (week.avg_mood || 0) :
                   metric === 'energy' ? (week.avg_energy || 0) : 0;
      
      return {
        week: new Date(week.week_of).toLocaleDateString('en', { month: 'short', day: 'numeric' }),
        value: parseFloat(value.toFixed(1))
      };
    }).reverse();
  }
  
  function calculateTotals() {
    if (!recentLogs.length) return {
      totalMinutes: 0,
      totalGoals: 0,
      avgMood: 0,
      avgEnergy: 0
    };
    
    const totals = recentLogs.reduce((acc, log) => {
      acc.minutes += log.learning_minutes || 0;
      acc.goals += log.completed_goals?.length || 0;
      acc.moodCount += log.mood ? 1 : 0;
      acc.moodSum += log.mood === 'amazing' ? 5 :
                     log.mood === 'good' ? 4 :
                     log.mood === 'okay' ? 3 :
                     log.mood === 'struggling' ? 2 : 0;
      acc.energyCount += log.energy_level ? 1 : 0;
      acc.energySum += log.energy_level || 0;
      return acc;
    }, { minutes: 0, goals: 0, moodSum: 0, moodCount: 0, energySum: 0, energyCount: 0 });
    
    return {
      totalMinutes: totals.minutes,
      totalGoals: totals.goals,
      avgMood: totals.moodCount > 0 ? (totals.moodSum / totals.moodCount).toFixed(1) : 0,
      avgEnergy: totals.energyCount > 0 ? (totals.energySum / totals.energyCount).toFixed(1) : 0
    };
  }
  
  function drawChart(data, metric) {
    if (!chartContainer || !data.length) return;
    
    const width = chartContainer.clientWidth;
    const height = 200;
    const padding = { top: 20, right: 20, bottom: 40, left: 40 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    // Clear previous chart
    chartContainer.innerHTML = '';
    
    // Create SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    chartContainer.appendChild(svg);
    
    // Calculate scales
    const maxValue = Math.max(...data.map(d => d.value)) * 1.1;
    const xScale = (i) => padding.left + (i * chartWidth / (data.length - 1));
    const yScale = (val) => height - padding.bottom - (val / maxValue * chartHeight);
    
    // Draw grid lines
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (i * chartHeight / 4);
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', padding.left);
      line.setAttribute('y1', y);
      line.setAttribute('x2', width - padding.right);
      line.setAttribute('y2', y);
      line.setAttribute('stroke', '#e5e5e5');
      line.setAttribute('stroke-dasharray', '2,2');
      svg.appendChild(line);
    }
    
    // Draw line
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    const pathData = data.map((d, i) => 
      `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(d.value)}`
    ).join(' ');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', '#3b82f6');
    path.setAttribute('stroke-width', '2');
    svg.appendChild(path);
    
    // Draw points and labels
    data.forEach((d, i) => {
      const x = xScale(i);
      const y = yScale(d.value);
      
      // Point
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', x);
      circle.setAttribute('cy', y);
      circle.setAttribute('r', '4');
      circle.setAttribute('fill', '#3b82f6');
      svg.appendChild(circle);
      
      // Value label
      const valueText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      valueText.setAttribute('x', x);
      valueText.setAttribute('y', y - 10);
      valueText.setAttribute('text-anchor', 'middle');
      valueText.setAttribute('font-size', '12');
      valueText.setAttribute('fill', '#525252');
      valueText.textContent = d.value;
      svg.appendChild(valueText);
      
      // Week label
      const weekText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      weekText.setAttribute('x', x);
      weekText.setAttribute('y', height - 10);
      weekText.setAttribute('text-anchor', 'middle');
      weekText.setAttribute('font-size', '10');
      weekText.setAttribute('fill', '#737373');
      weekText.textContent = d.week;
      svg.appendChild(weekText);
    });
  }
  
  $: metricData = getMetricData(selectedMetric);
  $: totals = calculateTotals();
  $: if (chartContainer && metricData.length) drawChart(metricData, selectedMetric);
  
  onMount(() => {
    if (metricData.length) drawChart(metricData, selectedMetric);
  });
</script>

<div class="space-y-6">
  <!-- Summary Cards -->
  <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div class="card-zen text-center">
      <p class="text-3xl font-bold text-blue-600">{totals.totalMinutes}</p>
      <p class="text-sm text-zen-gray-600">Minutes Learned</p>
    </div>
    <div class="card-zen text-center">
      <p class="text-3xl font-bold text-green-600">{totals.totalGoals}</p>
      <p class="text-sm text-zen-gray-600">Goals Completed</p>
    </div>
    <div class="card-zen text-center">
      <p class="text-3xl font-bold text-purple-600">{totals.avgMood}</p>
      <p class="text-sm text-zen-gray-600">Avg Mood</p>
    </div>
    <div class="card-zen text-center">
      <p class="text-3xl font-bold text-orange-600">{streak?.current_streak || 0}</p>
      <p class="text-sm text-zen-gray-600">Day Streak</p>
    </div>
  </div>
  
  <!-- Chart -->
  <div class="card-zen">
    <div class="flex items-center justify-between mb-4">
      <h3 class="font-semibold">Weekly Trends</h3>
      <select
        bind:value={selectedMetric}
        class="px-3 py-1 border border-zen-gray-300 rounded-lg text-sm"
      >
        {#each metrics as metric}
          <option value={metric.id}>{metric.label}</option>
        {/each}
      </select>
    </div>
    
    <div bind:this={chartContainer} class="h-[200px]">
      {#if !metricData.length}
        <div class="h-full flex items-center justify-center text-zen-gray-500">
          No data available yet
        </div>
      {/if}
    </div>
  </div>
</div>
```

## Build the Complete Tracker Page (1.5 hours)

### Step 8: Create the Main Tracker Page
Replace `src/routes/tracker/+page.svelte`:
```svelte
<script>
  import { onMount } from 'svelte';
  import { trackerStore, streakStatus } from '$lib/stores/tracker';
  import { roadmapStore } from '$lib/stores/roadmap';
  import { user } from '$lib/stores/user';
  import GoalInput from '$lib/components/GoalInput.svelte';
  import MoodEnergyTracker from '$lib/components/MoodEnergyTracker.svelte';
  import CalendarHeatmap from '$lib/components/CalendarHeatmap.svelte';
  import LearningAnalytics from '$lib/components/LearningAnalytics.svelte';
  import { fade, slide } from 'svelte/transition';
  
  let userId = '';
  let activeTab = 'today';
  let reflection = '';
  let keyLearning = '';
  let learningMinutes = 0;
  let focusSessions = 0;
  let showAchievement = null;
  let saving = false;
  
  const tabs = [
    { id: 'today', label: 'Today', icon: '📝' },
    { id: 'history', label: 'History', icon: '📊' },
    { id: 'achievements', label: 'Achievements', icon: '🏆' }
  ];
  
  onMount(async () => {
    // Initialize user
    user.init();
    const unsubscribe = user.subscribe(u => {
      userId = u.id;
      if (u.id) {
        loadTrackerData();
      }
    });
    
    // Load roadmaps for context
    await roadmapStore.loadRoadmaps();
    
    return unsubscribe;
  });
  
  async function loadTrackerData() {
    await trackerStore.loadAll(userId);
    
    // Load today's data into form
    const todayLog = $trackerStore.todayLog;
    if (todayLog) {
      reflection = todayLog.reflection || '';
      keyLearning = todayLog.key_learning || '';
      learningMinutes = todayLog.learning_minutes || 0;
      focusSessions = todayLog.focus_sessions || 0;
    }
  }
  
  async function saveTodayLog() {
    if (!userId || saving) return;
    
    saving = true;
    
    // Gather roadmap progress from today
    const roadmapProgress = {};
    for (const roadmap of $roadmapStore.roadmaps) {
      const progress = await roadmapStore.loadProgress(userId, roadmap.id);
      if (progress && progress.last_activity) {
        const lastActivity = new Date(progress.last_activity);
        const today = new Date();
        if (lastActivity.toDateString() === today.toDateString()) {
          roadmapProgress[roadmap.slug] = {
            name: roadmap.name,
            stages_completed: progress.completed_stages
          };
        }
      }
    }
    
    const logData = {
      goals: $trackerStore.todayLog?.goals || [],
      completed_goals: $trackerStore.todayLog?.completed_goals || [],
      mood: $trackerStore.todayLog?.mood,
      energy_level: $trackerStore.todayLog?.energy_level,
      learning_minutes: learningMinutes,
      focus_sessions: focusSessions,
      reflection,
      key_learning: keyLearning,
      roadmap_progress: roadmapProgress
    };
    
    const result = await trackerStore.saveTodayLog(userId, logData);
    
    if (result) {
      showSuccessAnimation();
      
      // Check for new achievements
      const newAchievements = await trackerStore.checkAchievements(userId);
      if (newAchievements && newAchievements.length > 0) {
        showAchievement = newAchievements[0];
        setTimeout(() => showAchievement = null, 5000);
      }
    }
    
    saving = false;
  }
  
  function showSuccessAnimation() {
    // Simple success feedback
    const button = document.querySelector('#save-button');
    if (button) {
      button.textContent = 'Saved! ✅';
      setTimeout(() => {
        button.textContent = 'Save Progress';
      }, 2000);
    }
  }
  
  function handleGoalsUpdate(event) {
    if (!$trackerStore.todayLog) {
      $trackerStore.todayLog = {};
    }
    $trackerStore.todayLog.goals = event.detail.goals;
    $trackerStore.todayLog.completed_goals = event.detail.completedGoals;
  }
  
  function handleMoodEnergyUpdate(event) {
    if (!$trackerStore.todayLog) {
      $trackerStore.todayLog = {};
    }
    $trackerStore.todayLog.mood = event.detail.mood;
    $trackerStore.todayLog.energy_level = event.detail.energyLevel;
  }
  
  function exportData() {
    const data = {
      streak: $trackerStore.streak,
      logs: $trackerStore.recentLogs,
      achievements: $trackerStore.achievements,
      stats: $trackerStore.weeklyStats
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `learning-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
</script>

<div class="max-w-6xl mx-auto space-y-6">
  <!-- Header with Streak -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold">Daily Learning Tracker</h1>
      <p class="text-zen-gray-600 mt-1">
        Track your progress and build consistent learning habits
      </p>
    </div>
    
    {#if $streakStatus.hasStreak}
      <div class="flex items-center gap-3 px-4 py-2 bg-orange-100 rounded-lg">
        <span class="text-3xl">🔥</span>
        <div>
          <p class="font-semibold text-orange-800">
            {$streakStatus.current} Day Streak!
          </p>
          <p class="text-xs text-orange-600">{$streakStatus.message}</p>
        </div>
      </div>
    {/if}
  </div>
  
  <!-- Tabs -->
  <div class="flex gap-1 p-1 bg-zen-gray-100 rounded-lg">
    {#each tabs as tab}
      <button
        on:click={() => activeTab = tab.id}
        class="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg
               transition-all duration-200
               {activeTab === tab.id 
                 ? 'bg-white shadow-sm text-blue-600' 
                 : 'text-zen-gray-600 hover:text-zen-gray-800'}"
      >
        <span>{tab.icon}</span>
        <span>{tab.label}</span>
      </button>
    {/each}
  </div>
  
  <!-- Tab Content -->
  {#if activeTab === 'today'}
    <div class="space-y-6" in:fade={{ duration: 200 }}>
      <!-- Goals -->
      <div class="card-zen">
        <GoalInput
          goals={$trackerStore.todayLog?.goals || []}
          completedGoals={$trackerStore.todayLog?.completed_goals || []}
          on:update={handleGoalsUpdate}
        />
      </div>
      
      <!-- Mood & Energy -->
      <div class="card-zen">
        <h2 class="font-semibold mb-4">How's Your Day?</h2>
        <MoodEnergyTracker
          mood={$trackerStore.todayLog?.mood}
          energyLevel={$trackerStore.todayLog?.energy_level}
          on:update={handleMoodEnergyUpdate}
        />
      </div>
      
      <!-- Learning Time -->
      <div class="card-zen">
        <h2 class="font-semibold mb-4">Learning Activity</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-zen-gray-700 mb-2">
              Total Learning Time (minutes)
            </label>
            <input
              type="number"
              bind:value={learningMinutes}
              min="0"
              max="480"
              class="w-full px-3 py-2 border border-zen-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-zen-gray-700 mb-2">
              Focus Sessions Completed
            </label>
            <input
              type="number"
              bind:value={focusSessions}
              min="0"
              max="20"
              class="w-full px-3 py-2 border border-zen-gray-300 rounded-lg"
            />
          </div>
        </div>
      </div>
      
      <!-- Reflection -->
      <div class="card-zen">
        <h2 class="font-semibold mb-4">Daily Reflection</h2>
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-zen-gray-700 mb-2">
              Key learning or insight from today
            </label>
            <input
              bind:value={keyLearning}
              type="text"
              placeholder="What was your main takeaway?"
              class="w-full px-3 py-2 border border-zen-gray-300 rounded-lg"
            />
          </div>
          <div>
            <label class="block text-sm font-medium text-zen-gray-700 mb-2">
              Reflection (optional)
            </label>
            <textarea
              bind:value={reflection}
              placeholder="How did today go? What could be improved?"
              rows="3"
              class="w-full px-3 py-2 border border-zen-gray-300 rounded-lg resize-none"
            />
          </div>
        </div>
      </div>
      
      <!-- Save Button -->
      <div class="flex justify-end">
        <button
          id="save-button"
          on:click={saveTodayLog}
          disabled={saving}
          class="btn-primary px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Progress'}
        </button>
      </div>
    </div>
  {:else if activeTab === 'history'}
    <div class="space-y-6" in:fade={{ duration: 200 }}>
      <!-- Calendar Heatmap -->
      <div class="card-zen">
        <h2 class="font-semibold mb-4">Your Learning Journey</h2>
        <CalendarHeatmap 
          logs={$trackerStore.recentLogs}
          year={new Date().getFullYear()}
        />
      </div>
      
      <!-- Analytics -->
      <LearningAnalytics
        weeklyStats={$trackerStore.weeklyStats || []}
        recentLogs={$trackerStore.recentLogs || []}
        streak={$trackerStore.streak}
      />
      
      <!-- Export -->
      <div class="text-center">
        <button
          on:click={exportData}
          class="text-sm text-blue-600 hover:text-blue-700"
        >
          Export all data as JSON
        </button>
      </div>
    </div>
  {:else if activeTab === 'achievements'}
    <div class="space-y-6" in:fade={{ duration: 200 }}>
      <div class="card-zen">
        <h2 class="font-semibold mb-4">Your Achievements</h2>
        
        {#if $trackerStore.achievements.length === 0}
          <p class="text-center text-zen-gray-500 py-8">
            Complete daily logs to unlock achievements!
          </p>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            {#each $trackerStore.achievements as achievement}
              <div class="flex items-start gap-4 p-4 bg-gradient-to-br from-yellow-50 to-orange-50 
                          rounded-lg border border-yellow-200">
                <div class="text-3xl">
                  {achievement.data?.icon || '🏅'}
                </div>
                <div class="flex-1">
                  <h3 class="font-semibold">{achievement.title}</h3>
                  <p class="text-sm text-zen-gray-600">{achievement.description}</p>
                  <p class="text-xs text-zen-gray-500 mt-1">
                    Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
      
      <!-- Stats Summary -->
      {#if $trackerStore.streak}
        <div class="card-zen">
          <h3 class="font-semibold mb-4">Lifetime Stats</h3>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p class="text-2xl font-bold text-blue-600">
                {$trackerStore.streak.total_days}
              </p>
              <p class="text-sm text-zen-gray-600">Total Days</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-green-600">
                {$trackerStore.streak.longest_streak}
              </p>
              <p class="text-sm text-zen-gray-600">Longest Streak</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-purple-600">
                {$trackerStore.achievements.length}
              </p>
              <p class="text-sm text-zen-gray-600">Achievements</p>
            </div>
            <div>
              <p class="text-2xl font-bold text-orange-600">
                {Math.round(($trackerStore.streak.total_days / 365) * 100)}%
              </p>
              <p class="text-sm text-zen-gray-600">Year Progress</p>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Achievement Notification -->
{#if showAchievement}
  <div 
    class="fixed top-4 right-4 z-50"
    in:slide={{ duration: 300 }}
    out:fade={{ duration: 200 }}
  >
    <div class="bg-gradient-to-r from-yellow-400 to-orange-400 text-white p-6 rounded-lg shadow-xl
                flex items-center gap-4 max-w-sm">
      <div class="text-4xl">🎉</div>
      <div>
        <p class="font-bold text-lg">Achievement Unlocked!</p>
        <p>{showAchievement.title}</p>
      </div>
    </div>
  </div>
{/if}
```

## Final Polish and Integration (1 hour)

### Step 9: Create App-Wide Notifications
Create `src/lib/components/NotificationCenter.svelte`:
```svelte
<script>
  import { onMount } from 'svelte';
  import { trackerStore } from '$lib/stores/tracker';
  import { user } from '$lib/stores/user';
  
  let userId = '';
  let notifications = [];
  let showNotifications = false;
  
  onMount(() => {
    user.subscribe(u => {
      userId = u.id;
      if (u.id) {
        checkNotifications();
      }
    });
    
    // Check every hour
    const interval = setInterval(checkNotifications, 3600000);
    return () => clearInterval(interval);
  });
  
  async function checkNotifications() {
    if (!userId) return;
    
    const newNotifications = [];
    
    // Check if today's log exists
    await trackerStore.loadTodayLog(userId);
    if (!$trackerStore.todayLog) {
      newNotifications.push({
        id: 'daily-log',
        type: 'reminder',
        title: 'Daily Check-in',
        message: "Don't forget to log your learning progress today!",
        icon: '📝'
      });
    }
    
    // Check streak status
    await trackerStore.loadStreak(userId);
    const streak = $trackerStore.streak;
    if (streak && streak.current_streak > 0) {
      const lastLog = new Date(streak.last_log_date);
      const today = new Date();
      const daysSince = Math.floor((today - lastLog) / (1000 * 60 * 60 * 24));
      
      if (daysSince === 1) {
        newNotifications.push({
          id: 'streak-warning',
          type: 'warning',
          title: 'Streak at Risk!',
          message: `Log today to maintain your ${streak.current_streak} day streak!`,
          icon: '🔥'
        });
      }
    }
    
    notifications = newNotifications;
  }
  
  function dismissNotification(id) {
    notifications = notifications.filter(n => n.id !== id);
  }
</script>

{#if notifications.length > 0}
  <div class="fixed bottom-4 right-4 z-40">
    <button
      on:click={() => showNotifications = !showNotifications}
      class="relative p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600
             transition-colors"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {#if notifications.length > 0}
        <span class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs">
          {notifications.length}
        </span>
      {/if}
    </button>
    
    {#if showNotifications}
      <div class="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-xl border border-zen-gray-200">
        <div class="p-4 border-b border-zen-gray-200">
          <h3 class="font-semibold">Notifications</h3>
        </div>
        <div class="max-h-96 overflow-y-auto">
          {#each notifications as notification}
            <div class="p-4 border-b border-zen-gray-100 hover:bg-zen-gray-50">
              <div class="flex items-start gap-3">
                <span class="text-2xl">{notification.icon}</span>
                <div class="flex-1">
                  <p class="font-medium text-sm">{notification.title}</p>
                  <p class="text-xs text-zen-gray-600 mt-1">{notification.message}</p>
                </div>
                <button
                  on:click={() => dismissNotification(notification.id)}
                  class="text-zen-gray-400 hover:text-zen-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}
```

### Step 10: Add to Layout
Update `src/routes/+layout.svelte` to include notifications:
```svelte
<script>
  // ... existing imports
  import NotificationCenter from '$lib/components/NotificationCenter.svelte';
  
  // ... existing code
</script>

<!-- ... existing layout ... -->

<!-- Add before closing div -->
<NotificationCenter />
```

### Step 11: Create Welcome/Onboarding
Create `src/lib/components/Welcome.svelte`:
```svelte
<script>
  import { user } from '$lib/stores/user';
  import { fade } from 'svelte/transition';
  
  let showWelcome = false;
  let currentStep = 0;
  
  const steps = [
    {
      title: 'Welcome to LearningOS! 🎉',
      content: 'Your personal AI-powered learning sanctuary. Let me show you around.',
      action: 'Get Started'
    },
    {
      title: '📰 Curated Feeds',
      content: 'Stay updated with the latest AI/ML content from top sources, all in one place.',
      action: 'Next'
    },
    {
      title: '🎯 Learning Roadmaps',
      content: 'Follow structured paths to master complex topics with trackable progress.',
      action: 'Next'
    },
    {
      title: '💬 AI Assistant',
      content: 'Get personalized help from our AI that understands your learning context.',
      action: 'Next'
    },
    {
      title: '✅ Daily Tracker',
      content: 'Build consistent habits and visualize your learning journey over time.',
      action: 'Start Learning!'
    }
  ];
  
  function checkFirstVisit() {
    const hasVisited = localStorage.getItem('learningos_welcomed');
    if (!hasVisited) {
      showWelcome = true;
    }
  }
  
  function nextStep() {
    if (currentStep < steps.length - 1) {
      currentStep++;
    } else {
      completeOnboarding();
    }
  }
  
  function completeOnboarding() {
    localStorage.setItem('learningos_welcomed', 'true');
    showWelcome = false;
    
    // Unlock welcome achievement
    user.setPreference('onboarded', true);
  }
  
  checkFirstVisit();
</script>

{#if showWelcome}
  <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
    <div 
      class="bg-white rounded-lg shadow-xl max-w-md w-full p-8"
      in:fade={{ duration: 300 }}
    >
      <div class="text-center">
        <div class="text-6xl mb-4">
          {currentStep === 0 ? '🧠' : 
           currentStep === 1 ? '📰' :
           currentStep === 2 ? '🎯' :
           currentStep === 3 ? '💬' : '✅'}
        </div>
        <h2 class="text-2xl font-bold mb-4">{steps[currentStep].title}</h2>
        <p class="text-zen-gray-600 mb-8">{steps[currentStep].content}</p>
        
        <div class="flex items-center justify-between">
          <div class="flex gap-1">
            {#each steps as _, i}
              <div 
                class="w-2 h-2 rounded-full transition-colors
                       {i === currentStep ? 'bg-blue-500' : 'bg-zen-gray-300'}"
              />
            {/each}
          </div>
          
          <button
            on:click={nextStep}
            class="btn-primary"
          >
            {steps[currentStep].action}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}
```

### Step 12: Performance Optimizations
Create `src/lib/utils/performance.js`:
```javascript
// Debounce function for search inputs
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Lazy load images
export function lazyLoadImage(node, src) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        node.src = src;
        observer.unobserve(node);
      }
    });
  });
  
  observer.observe(node);
  
  return {
    destroy() {
      observer.unobserve(node);
    }
  };
}

// Cache manager
export class CacheManager {
  constructor(prefix = 'learningos_') {
    this.prefix = prefix;
  }
  
  set(key, value, ttlMinutes = 60) {
    const item = {
      value: value,
      expiry: new Date().getTime() + ttlMinutes * 60 * 1000
    };
    localStorage.setItem(this.prefix + key, JSON.stringify(item));
  }
  
  get(key) {
    const itemStr = localStorage.getItem(this.prefix + key);
    if (!itemStr) return null;
    
    const item = JSON.parse(itemStr);
    if (new Date().getTime() > item.expiry) {
      localStorage.removeItem(this.prefix + key);
      return null;
    }
    
    return item.value;
  }
  
  clear(key) {
    if (key) {
      localStorage.removeItem(this.prefix + key);
    } else {
      // Clear all cached items
      Object.keys(localStorage)
        .filter(k => k.startsWith(this.prefix))
        .forEach(k => localStorage.removeItem(k));
    }
  }
}
```

## Final Testing and Deployment (30 minutes)

### Step 13: Comprehensive Testing Checklist
```bash
# 1. Test Daily Tracker
npm run dev
# Navigate to /tracker
# - Add goals and mark complete
# - Set mood and energy
# - Add learning time
# - Write reflection
# - Save and verify persistence

# 2. Test Streak System
# - Create logs for multiple days
# - Verify streak calculation
# - Test streak break and restart

# 3. Test Calendar Heatmap
# - Switch to History tab
# - Verify calendar shows activity
# - Hover over days for tooltips

# 4. Test Analytics
# - Verify charts render
# - Switch between metrics
# - Check calculations are correct

# 5. Test Achievements
# - Complete various actions
# - Verify achievements unlock
# - Check notification appears

# 6. Test Export
# - Export data as JSON
# - Verify file downloads

# 7. Integration Tests
# - Log learning in tracker
# - Go to roadmap, complete stages
# - Verify roadmap progress shows in tracker
# - Use AI chat
# - Check all features work together

# 8. Mobile Testing
# - Test on mobile viewport
# - Verify all tabs are accessible
# - Check touch interactions work
```

### Step 14: Fix Common Issues
Add error boundaries and loading states where missing:

```svelte
<!-- Add to any async component -->
{#await promise}
  <div class="flex justify-center py-8">
    <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
{:then data}
  <!-- Content -->
{:catch error}
  <div class="text-red-600 text-center py-8">
    Error: {error.message}
  </div>
{/await}
```

### Step 15: Final Deployment
```bash
# Run final build test
npm run build
npm run preview

# Commit everything
git add .
git commit -m "Day 5: Complete tracker with analytics and final polish"

# Deploy to production
vercel --prod

# Verify environment variables are set:
# - OPENAI_API_KEY
# - PUBLIC_SUPABASE_URL  
# - PUBLIC_SUPABASE_ANON_KEY
```

## Final App Checklist

✅ **Core Features Complete:**
- [ ] 📰 Feeds - RSS aggregation with 5+ sources
- [ ] 🎯 Roadmaps - 3 learning paths with progress tracking
- [ ] 💬 AI Chat - Context-aware assistant with streaming
- [ ] ✅ Tracker - Daily logs, streaks, and analytics
- [ ] 🔄 All features integrated and working together

✅ **User Experience:**
- [ ] Clean, minimalist design
- [ ] Mobile responsive
- [ ] Loading states everywhere
- [ ] Error handling
- [ ] Keyboard shortcuts
- [ ] Smooth animations
- [ ] Welcome onboarding

✅ **Data & Analytics:**
- [ ] Progress persistence
- [ ] Streak calculation
- [ ] Weekly statistics
- [ ] Achievement system
- [ ] Export functionality
- [ ] Calendar visualization

✅ **Polish:**
- [ ] Notifications
- [ ] Success animations
- [ ] Empty states
- [ ] Help tooltips
- [ ] Consistent styling
- [ ] Performance optimized

## Summary

You've built a complete learning management system in 5 days! The app now has:

1. **Intelligent Feed Aggregation** - Stays updated with AI/ML content
2. **Structured Learning Paths** - With granular progress tracking
3. **Context-Aware AI Assistant** - Knows what you're learning
4. **Comprehensive Tracking** - Daily logs, streaks, and analytics
5. **Gamification** - Achievements and visual progress
6. **Data Portability** - Export and own your data

The app follows your zen philosophy:
- Minimalist design that doesn't overwhelm
- Focused features that serve the core learning journey
- Calm, purposeful interactions
- Respect for user data and privacy

**Post-MVP Ideas:**
1. **Collaborative Learning** - Share roadmaps and progress
2. **Spaced Repetition** - Review system for better retention
3. **API Integration** - Connect to Notion, Obsidian, etc.
4. **Custom Roadmaps** - User-created learning paths
5. **Advanced Analytics** - Learning velocity, topic clustering
6. **Voice Notes** - Audio learning logs
7. **Social Features** - Learning buddies and accountability

The foundation is solid and extensible. You can now iterate based on your own usage and feedback. Happy learning! 🚀