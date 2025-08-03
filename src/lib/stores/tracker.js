import { writable, derived } from 'svelte/store';
import { supabase } from '../supabase.js';
import { eventBus, EVENTS } from './events.js';

// Helper function to get current user ID from auth
async function getCurrentUserId() {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
}

function createTrackerStore() {
  const { subscribe, set, update } = writable({
    loading: false,
    error: null,
    
    // Today's data
    todaysLog: null,
    todaysGoals: [],
    completedGoals: [],
    learningMinutes: 0,
    focusSessions: 0,
    mood: null,
    energyLevel: null,
    keyLearning: '',
    reflection: '',
    
    // Streak data
    streakData: {
      current_streak: 0,
      longest_streak: 0,
      total_days: 0,
      last_log_date: null,
      streak_start_date: null
    },
    
    // History
    recentLogs: [],
    weeklyStats: [],
    
    // Achievements
    achievements: [],
    newAchievements: []
  });

  return {
    subscribe,
    
    // Initialize tracker for user
    async init(userId) {
      update(store => ({ ...store, loading: true, error: null }));
      
      try {
        await Promise.all([
          this.loadTodaysLog(userId),
          this.loadStreakData(userId), 
          this.loadRecentHistory(userId),
          this.loadAchievements(userId)
        ]);
        
        // Clean up any orphaned completed goals
        await this.cleanupOrphanedGoals(userId);
        
        update(store => ({ ...store, loading: false }));
      } catch (error) {
        console.error('Error initializing tracker:', error);
        update(store => ({ 
          ...store, 
          loading: false, 
          error: 'Failed to load tracker data' 
        }));
      }
    },

    // Load or create today's log
    async loadTodaysLog(userId) {
      const today = new Date().toISOString().split('T')[0];
      
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      if (data) {
        update(store => ({
          ...store,
          todaysLog: data,
          todaysGoals: data.goals || [],
          completedGoals: data.completed_goals || [],
          learningMinutes: data.learning_minutes || 0,
          focusSessions: data.focus_sessions || 0,
          mood: data.mood,
          energyLevel: data.energy_level,
          keyLearning: data.key_learning || '',
          reflection: data.reflection || ''
        }));
      } else {
        // Create initial log entry
        const newLog = {
          user_id: userId,
          date: today,
          goals: [],
          completed_goals: [],
          learning_minutes: 0,
          focus_sessions: 0
        };
        
        const { data: created, error: createError } = await supabase
          .from('daily_logs')
          .insert([newLog])
          .select()
          .single();
          
        if (createError) throw createError;
        
        update(store => ({
          ...store,
          todaysLog: created,
          todaysGoals: [],
          completedGoals: [],
          learningMinutes: 0,
          focusSessions: 0,
          mood: null,
          energyLevel: null,
          keyLearning: '',
          reflection: ''
        }));
      }
    },

    // Load streak data
    async loadStreakData(userId) {
      const { data, error } = await supabase
        .from('streak_data')
        .select('*')
        .eq('user_id', userId)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      
      update(store => ({
        ...store,
        streakData: data || {
          current_streak: 0,
          longest_streak: 0,
          total_days: 0,
          last_log_date: null,
          streak_start_date: null
        }
      }));
    },

    // Load recent history (last 30 days)
    async loadRecentHistory(userId) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });
        
      if (error) throw error;
      
      update(store => ({ ...store, recentLogs: data || [] }));
    },

    // Load achievements
    async loadAchievements(userId) {
      const { data, error } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', userId)
        .order('unlocked_at', { ascending: false });
        
      if (error) throw error;
      
      update(store => ({ ...store, achievements: data || [] }));
    },

    // Add goal
    async addGoal(userId, goal) {
      if (!goal.trim()) return;
      
      update(store => ({
        ...store,
        todaysGoals: [...store.todaysGoals, goal.trim()]
      }));
      
      await this.saveTodaysLog(userId);
    },

    // Remove goal
    async removeGoal(userId, goalIndex) {
      update(store => {
        const newGoals = [...store.todaysGoals];
        const removedGoal = newGoals.splice(goalIndex, 1)[0];
        
        // Also remove from completed if it was completed
        const newCompleted = store.completedGoals.filter(g => g !== removedGoal);
        
        return {
          ...store,
          todaysGoals: newGoals,
          completedGoals: newCompleted
        };
      });
      
      await this.saveTodaysLog(userId);
    },

    // Clean up orphaned completed goals
    async cleanupOrphanedGoals(userId) {
      update(store => {
        const validCompleted = store.completedGoals.filter(goal => 
          store.todaysGoals.includes(goal)
        );
        
        if (validCompleted.length !== store.completedGoals.length) {
          console.log('🧹 Cleaning up orphaned completed goals');
          return { ...store, completedGoals: validCompleted };
        }
        return store;
      });
      
      await this.saveTodaysLog(userId);
    },

    // Toggle goal completion
    async toggleGoal(userId, goal) {
      update(store => {
        const isCompleted = store.completedGoals.includes(goal);
        const newCompleted = isCompleted
          ? store.completedGoals.filter(g => g !== goal)
          : [...store.completedGoals, goal];
          
        return {
          ...store,
          completedGoals: newCompleted
        };
      });
      
      await this.saveTodaysLog(userId);
    },

    // Update learning metrics
    async updateMetrics(userId, updates) {
      update(store => ({ ...store, ...updates }));
      await this.saveTodaysLog(userId);
    },

    // Update mood and energy
    async updateMoodEnergy(userId, mood, energyLevel) {
      update(store => ({ ...store, mood, energyLevel }));
      await this.saveTodaysLog(userId);
    },

    // Update reflection
    async updateReflection(userId, keyLearning, reflection) {
      update(store => ({ ...store, keyLearning, reflection }));
      await this.saveTodaysLog(userId);
    },

    // Save today's log to database
    async saveTodaysLog(userId) {
      let currentState;
      const unsubscribe = subscribe(state => { currentState = state; });
      unsubscribe();
      
      const today = new Date().toISOString().split('T')[0];
      
      const logData = {
        goals: currentState.todaysGoals,
        completed_goals: currentState.completedGoals,
        learning_minutes: currentState.learningMinutes,
        focus_sessions: currentState.focusSessions,
        mood: currentState.mood,
        energy_level: currentState.energyLevel,
        key_learning: currentState.keyLearning,
        reflection: currentState.reflection,
        updated_at: new Date().toISOString()
      };
      
      // Try to update first
      const { data: updateData, error: updateError } = await supabase
        .from('daily_logs')
        .update(logData)
        .eq('user_id', userId)
        .eq('date', today)
        .select();
        
      if (updateError) {
        console.error('Error updating log:', updateError);
        update(store => ({ 
          ...store, 
          error: 'Failed to save changes' 
        }));
        return;
      }
      
      // If no rows were updated, create a new log
      if (!updateData || updateData.length === 0) {
        const newLogData = {
          user_id: userId,
          date: today,
          ...logData
        };
        
        const { data: insertData, error: insertError } = await supabase
          .from('daily_logs')
          .insert([newLogData])
          .select()
          .single();
          
        if (insertError) {
          console.error('Error creating log:', insertError);
          update(store => ({ 
            ...store, 
            error: 'Failed to save changes' 
          }));
          return;
        }
        
        update(store => ({ ...store, todaysLog: insertData, error: null }));
      } else {
        update(store => ({ ...store, todaysLog: updateData[0], error: null }));
      }
      
      // Refresh streak data and check achievements
      await this.loadStreakData(userId);
      await this.checkAchievements(userId);
    },

    // Check for new achievements
    async checkAchievements(userId) {
      try {
        const { data, error } = await supabase.rpc('check_achievements', {
          p_user_id: userId
        });
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          update(store => ({
            ...store,
            newAchievements: data[0] || []
          }));
          
          // Reload achievements to show new ones
          await this.loadAchievements(userId);
        }
      } catch (error) {
        console.error('Error checking achievements:', error);
      }
    },



    // Get weekly analytics
    async getWeeklyAnalytics(userId, weeks = 12) {
      const { data, error } = await supabase
        .from('learning_stats')
        .select('*')
        .eq('user_id', userId)
        .order('week_of', { ascending: false })
        .limit(weeks);
        
      if (error) {
        console.error('Error loading weekly analytics:', error);
        return [];
      }
      
      return data || [];
    },

    // Start focus session
    async startFocusSession(userId) {
      update(store => ({
        ...store,
        focusSessions: store.focusSessions + 1
      }));
      
      await this.saveTodaysLog(userId);
    },

    // Add learning minutes
    async addLearningTime(userId, minutes) {
      update(store => ({
        ...store,
        learningMinutes: store.learningMinutes + minutes
      }));
      
      await this.saveTodaysLog(userId);
    },

    // Clear error
    clearError() {
      update(store => ({ ...store, error: null }));
    },

    // Clear new achievements notification
    clearNewAchievements() {
      update(store => ({ ...store, newAchievements: [] }));
    },

    // Track roadmap progress
    async trackRoadmapProgress(userId, roadmapName, stageName, isCompleted = false) {
      let currentState;
      const unsubscribe = subscribe(state => { currentState = state; });
      unsubscribe();
      
      const today = new Date().toISOString().split('T')[0];
      
      // Get or create today's log
      let { data: todaysLog, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('user_id', userId)
        .eq('date', today)
        .single();
        
      if (error && error.code === 'PGRST116') {
        // Create today's log if it doesn't exist
        const newLog = {
          user_id: userId,
          date: today,
          goals: [],
          completed_goals: [],
          learning_minutes: 0,
          focus_sessions: 0,
          roadmap_progress: {}
        };
        
        const { data: created, error: createError } = await supabase
          .from('daily_logs')
          .insert([newLog])
          .select()
          .single();
          
        if (createError) {
          console.error('Error creating daily log:', createError);
          return;
        }
        
        todaysLog = created;
      } else if (error) {
        console.error('Error fetching daily log:', error);
        return;
      }
      
      // Update roadmap progress
      const currentProgress = todaysLog.roadmap_progress || {};
      if (!currentProgress[roadmapName]) {
        currentProgress[roadmapName] = {
          stages_worked_on: [],
          stages_completed: [],
          time_spent: 0
        };
      }
      
      // Add stage to worked on if not already there
      if (!currentProgress[roadmapName].stages_worked_on.includes(stageName)) {
        currentProgress[roadmapName].stages_worked_on.push(stageName);
      }
      
      // Add to completed if completed
      if (isCompleted && !currentProgress[roadmapName].stages_completed.includes(stageName)) {
        currentProgress[roadmapName].stages_completed.push(stageName);
        
        // Automatically add 30 minutes of learning time for completing a stage
        await this.addLearningTime(userId, 30);
        
        // Add a goal if user doesn't have one for this roadmap today
        const roadmapGoal = `Complete ${stageName} in ${roadmapName}`;
        if (!currentState.todaysGoals.some(goal => goal.includes(roadmapName))) {
          await this.addGoal(userId, roadmapGoal);
        }
        
        // Mark the goal as completed
        setTimeout(async () => {
          await this.toggleGoal(userId, roadmapGoal);
        }, 100);
      }
      
      // Update the database
      const { error: updateError } = await supabase
        .from('daily_logs')
        .update({ 
          roadmap_progress: currentProgress,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('date', today);
        
      if (updateError) {
        console.error('Error updating roadmap progress:', updateError);
        return;
      }
      
      // Refresh today's log
      await this.loadTodaysLog(userId);
      
      // Check for achievements
      await this.checkAchievements(userId);
    }
  };
}

export const trackerStore = createTrackerStore();

// Listen for roadmap progress events to avoid circular dependency
eventBus.subscribe(events => {
  const lastEvent = events[events.length - 1];
  if (lastEvent && lastEvent.type === EVENTS.ROADMAP_PROGRESS) {
    const { userId, roadmapName, stageName, completed } = lastEvent.data;
    // Call trackRoadmapProgress directly on the store
    trackerStore.trackRoadmapProgress(userId, roadmapName, stageName, completed);
  }
});

// Derived stores for convenience
export const todaysProgress = derived(trackerStore, $tracker => {
  const totalGoals = $tracker.todaysGoals.length;
  // Clean up completed goals to only include goals that still exist
  const validCompletedGoals = $tracker.completedGoals.filter(completed => 
    $tracker.todaysGoals.includes(completed)
  );
  const completedGoals = validCompletedGoals.length;
  const completionRate = totalGoals > 0 ? (completedGoals / totalGoals) * 100 : 0;
  
  return {
    totalGoals,
    completedGoals,
    completionRate: Math.round(completionRate),
    hasLearningTime: $tracker.learningMinutes > 0,
    hasMoodData: $tracker.mood !== null,
    isComplete: completedGoals > 0 && $tracker.learningMinutes > 0
  };
});

export const streakInfo = derived(trackerStore, $tracker => ({
  current: $tracker.streakData.current_streak,
  longest: $tracker.streakData.longest_streak,
  total: $tracker.streakData.total_days,
  isActive: $tracker.streakData.last_log_date === new Date().toISOString().split('T')[0]
}));