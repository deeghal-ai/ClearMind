import { writable, derived } from 'svelte/store';
import { supabase } from '../supabase.js';
import { eventBus, EVENTS } from './events.js';

function createRoadmapStore() {
  const { subscribe, set, update } = writable({
    roadmaps: [],
    selectedRoadmap: null,
    progress: {},
    loading: false,
    error: null
  });

  return {
    subscribe,
    
    async loadRoadmaps() {
      update(s => ({ ...s, loading: true, error: null }));
      
      try {
        const { data, error } = await supabase
          .from('roadmaps')
          .select('*')
          .order('difficulty', { ascending: true });
        
        if (error) throw error;
        
        update(s => ({ 
          ...s, 
          roadmaps: data || [],
          selectedRoadmap: data?.[0] || null,
          loading: false 
        }));
        
        return data;
      } catch (error) {
        console.error('Error loading roadmaps:', error);
        update(s => ({ ...s, error: error.message, loading: false }));
        return null;
      }
    },
    
    async loadProgress(userId, roadmapId) {
      if (!userId || !roadmapId) return null;
      
      try {
        const { data, error } = await supabase
          .rpc('get_roadmap_with_progress', {
            p_user_id: userId,
            p_roadmap_id: roadmapId
          });
        
        if (error) throw error;
        
        if (data?.[0]) {
          update(s => ({
            ...s,
            progress: {
              ...s.progress,
              [roadmapId]: data[0].progress
            }
          }));
        }
        
        return data?.[0]?.progress;
      } catch (error) {
        console.error('Error loading progress:', error);
        return null;
      }
    },
    
    async loadAllProgress(userId) {
      if (!userId) return;
      
      try {
        const { data: roadmaps, error: roadmapError } = await supabase
          .from('roadmaps')
          .select('id');
        
        if (roadmapError) throw roadmapError;
        
        const progressPromises = roadmaps.map(roadmap => 
          this.loadProgress(userId, roadmap.id)
        );
        
        await Promise.all(progressPromises);
      } catch (error) {
        console.error('Error loading all progress:', error);
      }
    },
    
    async toggleStage(userId, roadmapId, stageIndex, completed) {
      if (!userId || !roadmapId || stageIndex === undefined) return false;
      
      try {
        console.log('Toggling stage:', { userId, roadmapId, stageIndex, completed });
        
        const { data, error } = await supabase
          .from('user_progress')
          .upsert({
            user_id: userId,
            roadmap_id: roadmapId,
            stage_index: stageIndex,
            completed: completed,
            completed_at: completed ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,roadmap_id,stage_index'
          });
        
        if (error) {
          console.error('Supabase error details:', error);
          throw error;
        }
        
        // Integrate with tracker - get the current roadmap and stage info
        let currentState;
        const unsubscribe = subscribe(state => { currentState = state; });
        unsubscribe();
        
        if (currentState.selectedRoadmap && currentState.selectedRoadmap.stages[stageIndex]) {
          const roadmapName = currentState.selectedRoadmap.name;
          const stageName = currentState.selectedRoadmap.stages[stageIndex].title;
          
          // Emit event for tracker to handle (avoids circular dependency)
          eventBus.emit(EVENTS.ROADMAP_PROGRESS, {
            userId,
            roadmapName,
            stageName,
            completed
          });
        }
        
        console.log('Stage toggle successful:', data);
        
        // Reload progress to get updated counts
        await this.loadProgress(userId, roadmapId);
        
        return true;
      } catch (error) {
        console.error('Error toggling stage:', error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        return false;
      }
    },
    
    async addStageNote(userId, roadmapId, stageIndex, note) {
      if (!userId || !roadmapId || stageIndex === undefined) return false;
      
      try {
        const { error } = await supabase
          .from('user_progress')
          .upsert({
            user_id: userId,
            roadmap_id: roadmapId,
            stage_index: stageIndex,
            notes: note,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,roadmap_id,stage_index'
          });
        
        if (error) throw error;
        
        await this.loadProgress(userId, roadmapId);
        return true;
      } catch (error) {
        console.error('Error adding stage note:', error);
        return false;
      }
    },
    
    async resetProgress(userId, roadmapId) {
      if (!userId || !roadmapId) return false;
      
      try {
        // Delete all user progress for this roadmap
        const { error: progressError } = await supabase
          .from('user_progress')
          .delete()
          .eq('user_id', userId)
          .eq('roadmap_id', roadmapId);
        
        if (progressError) throw progressError;
        
        // Delete roadmap progress summary
        const { error: summaryError } = await supabase
          .from('roadmap_progress')
          .delete()
          .eq('user_id', userId)
          .eq('roadmap_id', roadmapId);
        
        if (summaryError) throw summaryError;
        
        // Clear from local state
        update(s => ({
          ...s,
          progress: {
            ...s.progress,
            [roadmapId]: {
              started_at: null,
              completed_stages: 0,
              total_stages: s.selectedRoadmap?.stages?.length || 0,
              is_completed: false,
              percentage: 0,
              stage_progress: []
            }
          }
        }));
        
        return true;
      } catch (error) {
        console.error('Error resetting progress:', error);
        return false;
      }
    },
    
    selectRoadmap(roadmap) {
      update(s => ({ ...s, selectedRoadmap: roadmap }));
    },
    
    // Get statistics across all roadmaps for achievements
    async getStatistics(userId) {
      if (!userId) return null;
      
      try {
        const { data, error } = await supabase
          .from('roadmap_progress')
          .select('*')
          .eq('user_id', userId);
        
        if (error) throw error;
        
        const stats = {
          roadmapsStarted: data.length,
          roadmapsCompleted: data.filter(p => p.is_completed).length,
          totalStagesCompleted: data.reduce((sum, p) => sum + p.completed_stages, 0),
          averageCompletion: data.length > 0 
            ? data.reduce((sum, p) => sum + (p.completed_stages / p.total_stages * 100), 0) / data.length 
            : 0
        };
        
        return stats;
      } catch (error) {
        console.error('Error getting statistics:', error);
        return null;
      }
    }
  };
}

export const roadmapStore = createRoadmapStore();

// Derived store for current progress
export const currentProgress = derived(
  roadmapStore,
  $store => {
    if (!$store.selectedRoadmap) return null;
    
    const progress = $store.progress[$store.selectedRoadmap.id];
    
    // If no progress exists yet, return empty progress
    if (!progress) {
      return {
        completed_stages: 0,
        total_stages: $store.selectedRoadmap.stages?.length || 0,
        percentage: 0,
        stage_progress: [],
        started_at: null,
        last_activity: null,
        is_completed: false
      };
    }
    
    // Ensure all values are properly set
    return {
      completed_stages: progress.completed_stages || 0,
      total_stages: progress.total_stages || $store.selectedRoadmap.stages?.length || 0,
      percentage: progress.percentage || 0,
      stage_progress: progress.stage_progress || [],
      started_at: progress.started_at,
      last_activity: progress.last_activity,
      is_completed: progress.is_completed || false
    };
  }
);