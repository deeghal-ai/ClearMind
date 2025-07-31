// Progress tracking system using localStorage
const PROGRESS_PREFIX = 'learningos_progress_';
const ACHIEVEMENTS_KEY = 'learningos_achievements';

export class ProgressTracker {
  constructor(userId) {
    this.userId = userId;
  }

  // Get progress for a specific roadmap
  getProgress(roadmapId) {
    try {
      const key = `${PROGRESS_PREFIX}${this.userId}_${roadmapId}`;
      const stored = localStorage.getItem(key);
      
      if (!stored) {
        return this.createEmptyProgress(roadmapId);
      }
      
      return JSON.parse(stored);
    } catch (error) {
      console.warn('Failed to get progress:', error);
      return this.createEmptyProgress(roadmapId);
    }
  }

  // Save progress for a roadmap
  saveProgress(roadmapId, progress) {
    try {
      const key = `${PROGRESS_PREFIX}${this.userId}_${roadmapId}`;
      const progressData = {
        ...progress,
        roadmapId,
        userId: this.userId,
        lastUpdated: new Date().toISOString()
      };
      
      localStorage.setItem(key, JSON.stringify(progressData));
      this.checkForAchievements(roadmapId, progress);
      return true;
    } catch (error) {
      console.warn('Failed to save progress:', error);
      return false;
    }
  }

  // Toggle stage completion
  toggleStage(roadmapId, stageId) {
    const progress = this.getProgress(roadmapId);
    const stageIndex = progress.completedStages.indexOf(stageId);
    
    if (stageIndex >= 0) {
      // Remove stage
      progress.completedStages.splice(stageIndex, 1);
    } else {
      // Add stage
      progress.completedStages.push(stageId);
    }
    
    // Update current stage to the highest completed + 1
    progress.currentStage = progress.completedStages.length;
    
    // Calculate completion percentage if we have totalStages
    if (progress.totalStages && progress.totalStages > 0) {
      progress.completionPercentage = Math.floor((progress.completedStages.length / progress.totalStages) * 100);
    }
    
    this.saveProgress(roadmapId, progress);
    return progress;
  }

  // Check if a stage is completed
  isStageCompleted(roadmapId, stageId) {
    const progress = this.getProgress(roadmapId);
    return progress.completedStages.includes(stageId);
  }

  // Get completion percentage
  calculateCompletionPercentage(roadmapId, progress) {
    // This would need the roadmap data to calculate total stages
    // For now, we'll calculate it when we have the roadmap object
    return Math.floor((progress.completedStages.length / (progress.totalStages || 1)) * 100);
  }

  // Create empty progress object
  createEmptyProgress(roadmapId) {
    return {
      roadmapId,
      userId: this.userId,
      completedStages: [],
      currentStage: 0,
      completionPercentage: 0,
      totalStages: 0,
      startedAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      timeSpent: 0, // in minutes
      notes: {}
    };
  }

  // Get all progress for user
  getAllProgress() {
    const allProgress = {};
    
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`${PROGRESS_PREFIX}${this.userId}_`)) {
          const roadmapId = key.replace(`${PROGRESS_PREFIX}${this.userId}_`, '');
          const progress = JSON.parse(localStorage.getItem(key));
          allProgress[roadmapId] = progress;
        }
      }
    } catch (error) {
      console.warn('Failed to get all progress:', error);
    }
    
    return allProgress;
  }

  // Add note to a stage
  addStageNote(roadmapId, stageId, note) {
    const progress = this.getProgress(roadmapId);
    if (!progress.notes) progress.notes = {};
    
    progress.notes[stageId] = {
      content: note,
      timestamp: new Date().toISOString()
    };
    
    this.saveProgress(roadmapId, progress);
    return progress;
  }

  // Get stage note
  getStageNote(roadmapId, stageId) {
    const progress = this.getProgress(roadmapId);
    return progress.notes?.[stageId]?.content || '';
  }

  // Track time spent on roadmap
  addTimeSpent(roadmapId, minutes) {
    const progress = this.getProgress(roadmapId);
    progress.timeSpent = (progress.timeSpent || 0) + minutes;
    this.saveProgress(roadmapId, progress);
    return progress;
  }

  // Reset progress for a roadmap
  resetProgress(roadmapId) {
    try {
      const key = `${PROGRESS_PREFIX}${this.userId}_${roadmapId}`;
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn('Failed to reset progress:', error);
      return false;
    }
  }

  // Export progress data
  exportProgress() {
    const allProgress = this.getAllProgress();
    const exportData = {
      userId: this.userId,
      exportedAt: new Date().toISOString(),
      progress: allProgress,
      achievements: this.getAchievements()
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  // Achievement system
  checkForAchievements(roadmapId, progress) {
    const achievements = this.getAchievements();
    const newAchievements = [];

    // First stage completed
    if (progress.completedStages.length === 1 && !achievements.includes('first_stage')) {
      newAchievements.push('first_stage');
    }

    // First roadmap completed
    if (progress.completionPercentage === 100 && !achievements.includes('first_roadmap')) {
      newAchievements.push('first_roadmap');
    }

    // Streak achievements (would need date tracking)
    const allProgress = this.getAllProgress();
    const totalCompleted = Object.values(allProgress).reduce((sum, p) => sum + p.completedStages.length, 0);
    
    if (totalCompleted >= 10 && !achievements.includes('dedicated_learner')) {
      newAchievements.push('dedicated_learner');
    }

    if (newAchievements.length > 0) {
      this.addAchievements(newAchievements);
    }
  }

  // Get achievements
  getAchievements() {
    try {
      const stored = localStorage.getItem(ACHIEVEMENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      return [];
    }
  }

  // Add achievements
  addAchievements(achievements) {
    try {
      const existing = this.getAchievements();
      const updated = [...new Set([...existing, ...achievements])];
      localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(updated));
      return updated;
    } catch (error) {
      console.warn('Failed to save achievements:', error);
      return [];
    }
  }

  // Get learning statistics
  getStatistics() {
    const allProgress = this.getAllProgress();
    const roadmapCount = Object.keys(allProgress).length;
    const totalStages = Object.values(allProgress).reduce((sum, p) => sum + p.completedStages.length, 0);
    const totalTime = Object.values(allProgress).reduce((sum, p) => sum + (p.timeSpent || 0), 0);
    const completedRoadmaps = Object.values(allProgress).filter(p => p.completionPercentage === 100).length;

    return {
      roadmapsStarted: roadmapCount,
      roadmapsCompleted: completedRoadmaps,
      totalStagesCompleted: totalStages,
      totalTimeSpent: totalTime,
      averageCompletion: roadmapCount > 0 ? 
        Object.values(allProgress).reduce((sum, p) => sum + p.completionPercentage, 0) / roadmapCount : 0,
      achievements: this.getAchievements()
    };
  }
}