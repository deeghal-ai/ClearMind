<script>
  import { onMount, onDestroy } from 'svelte';
  import { roadmapStore, currentProgress } from '../lib/stores/roadmap.js';
  import { navigation } from '../lib/stores/navigation.js';
  import { chatPanel } from '../lib/stores/chatPanel.js';
  import { trackerStore } from '../lib/stores/tracker.js';
  import { isAuthenticated } from '../lib/stores/user.js';

  export let userId;

  let showNoteModal = false;
  let noteStageId = '';
  let noteContent = '';
  let filterDifficulty = 'all';
  let searchTerm = '';
  let expandedStages = new Set();
  let showStatistics = false;
  let statistics = null;
  let selectedView = 'overview'; // 'overview' or 'detailed'

  const difficulties = ['all', 'beginner', 'intermediate', 'advanced'];

  // Subscribe to store updates
  let unsubscribe;

  onMount(async () => {
    // Subscribe to roadmap store
    unsubscribe = roadmapStore.subscribe(state => {
      // Auto-select first roadmap if none selected and roadmaps are loaded
      if (state.roadmaps.length > 0 && !state.selectedRoadmap && !state.loading) {
        selectRoadmap(state.roadmaps[0]);
      }
    });

    // Load roadmaps from Supabase
    await roadmapStore.loadRoadmaps();
    
    // Load progress for all roadmaps if user is available
    if (userId) {
      await roadmapStore.loadAllProgress(userId);
      statistics = await roadmapStore.getStatistics(userId);
    }
  });

  onDestroy(() => {
    if (unsubscribe) unsubscribe();
  });

  async function selectRoadmap(roadmap) {
    roadmapStore.selectRoadmap(roadmap);
    if (userId) {
      await roadmapStore.loadProgress(userId, roadmap.id);
    }
    selectedView = 'detailed';
  }

  async function toggleStage(stageIndex) {
    if (!userId || !$roadmapStore.selectedRoadmap) return;
    
    const currentStageProgress = getCurrentStageProgress(stageIndex);
    const newCompleted = !currentStageProgress.completed;
    
    const success = await roadmapStore.toggleStage(
      userId,
      $roadmapStore.selectedRoadmap.id,
      stageIndex,
      newCompleted
    );
    
    if (success) {
      showToast(`Stage ${newCompleted ? 'completed' : 'unchecked'}!`);
      
      // Update statistics
      if (userId) {
        statistics = await roadmapStore.getStatistics(userId);
      }
    } else {
      showToast('Failed to update progress', 'error');
    }
  }

  function toggleStageExpansion(stageIndex) {
    if (expandedStages.has(stageIndex)) {
      expandedStages.delete(stageIndex);
    } else {
      expandedStages.add(stageIndex);
    }
    expandedStages = expandedStages;
  }

  function openNoteModal(stageId) {
    noteStageId = stageId;
    noteContent = getStageNote(stageId);
    showNoteModal = true;
  }

  async function saveNote() {
    if (!userId || !$roadmapStore.selectedRoadmap || !noteStageId) return;
    
    const stageIndex = $roadmapStore.selectedRoadmap.stages.findIndex(s => s.id === noteStageId);
    if (stageIndex === -1) return;

    const success = await roadmapStore.addStageNote(
      userId,
      $roadmapStore.selectedRoadmap.id,
      stageIndex,
      noteContent
    );

    if (success) {
      showToast('Note saved!');
      showNoteModal = false;
      noteStageId = '';
      noteContent = '';
    } else {
      showToast('Failed to save note', 'error');
    }
  }

  async function resetProgress() {
    if (!$roadmapStore.selectedRoadmap || !confirm('Are you sure you want to reset all progress for this roadmap?')) {
      return;
    }
    
    const success = await roadmapStore.resetProgress(userId, $roadmapStore.selectedRoadmap.id);
    
    if (success) {
      showToast('Progress reset successfully');
      // Update statistics
      if (userId) {
        statistics = await roadmapStore.getStatistics(userId);
      }
    } else {
      showToast('Failed to reset progress', 'error');
    }
  }

  function getCurrentStageProgress(stageIndex) {
    const stageProgress = $currentProgress?.stage_progress || [];
    const stage = stageProgress.find(sp => sp.stage_index === stageIndex);
    return {
      completed: stage?.completed || false,
      hasNote: stage?.notes && stage.notes.trim().length > 0
    };
  }

  function getStageNote(stageId) {
    if (!$roadmapStore.selectedRoadmap || !$currentProgress) return '';
    
    const stageIndex = $roadmapStore.selectedRoadmap.stages.findIndex(s => s.id === stageId);
    if (stageIndex === -1) return '';
    
    const stageProgress = $currentProgress.stage_progress || [];
    const stage = stageProgress.find(sp => sp.stage_index === stageIndex);
    return stage?.notes || '';
  }

  function formatEstimatedTime(time) {
    return time || 'Variable';
  }

  function getNextStage() {
    if (!$roadmapStore.selectedRoadmap || !$currentProgress) return null;
    
    for (let i = 0; i < $roadmapStore.selectedRoadmap.stages.length; i++) {
      const stageProgress = getCurrentStageProgress(i);
      if (!stageProgress.completed) {
        return $roadmapStore.selectedRoadmap.stages[i];
      }
    }
    return null;
  }

  function getResourceIcon(type) {
    const icons = {
      docs: '📄',
      video: '🎥',
      article: '📰',
      code: '💻',
      paper: '📚'
    };
    return icons[type] || '🔗';
  }

  function getDifficultyColor(difficulty) {
    const colors = {
      beginner: 'bg-green-100 text-green-700 border-green-200',
      intermediate: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      advanced: 'bg-red-100 text-red-700 border-red-200'
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-700 border-gray-200';
  }

  // Filtered roadmaps based on search and difficulty
  $: filteredRoadmaps = $roadmapStore.roadmaps.filter(roadmap => {
    // Difficulty filter
    if (filterDifficulty !== 'all' && roadmap.difficulty !== filterDifficulty) {
      return false;
    }
    
    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return roadmap.name.toLowerCase().includes(searchLower) ||
             roadmap.description.toLowerCase().includes(searchLower) ||
             roadmap.tags?.some(tag => tag.toLowerCase().includes(searchLower));
    }
    
    return true;
  });

  // Toast notification system
  let toastMessage = '';
  let toastType = 'success';
  let showingToast = false;

  function showToast(message, type = 'success') {
    toastMessage = message;
    toastType = type;
    showingToast = true;
    
    setTimeout(() => {
      showingToast = false;
    }, 3000);
  }

  function askAIForHelp() {
    const currentRoadmap = $roadmapStore.selectedRoadmap;
    if (!currentRoadmap) return;
    
    // Find the current stage (first incomplete stage or last completed)
    const progress = $currentProgress;
    let currentStageIndex = 0;
    let currentStage = currentRoadmap.stages[0];
    
    if (progress?.stage_progress?.length > 0) {
      // Find the first incomplete stage
      const incompleteIndex = progress.stage_progress.findIndex(sp => !sp.completed);
      if (incompleteIndex >= 0) {
        currentStageIndex = incompleteIndex;
        currentStage = currentRoadmap.stages[incompleteIndex];
      } else {
        // All stages completed, use the last stage
        currentStageIndex = currentRoadmap.stages.length - 1;
        currentStage = currentRoadmap.stages[currentStageIndex];
      }
    }
    
    // Create context for the AI chat
    const context = {
      type: 'roadmap',
      roadmap: currentRoadmap.name,
      stage: currentStage?.title,
      stageDescription: currentStage?.description,
      completedStages: progress?.completed_stages || 0,
      totalStages: progress?.total_stages || currentRoadmap.stages.length,
      prompt: currentStage?.practicePrompt,
      difficulty: currentRoadmap.difficulty,
      estimatedTime: currentStage?.estimatedTime
    };
    
    // Open chat panel with context
    chatPanel.openWithContext(context);
    
    showToast('Context loaded! AI chat opened.', 'success');
  }

  function askAIForStageHelp(stageIndex, stage) {
    const currentRoadmap = $roadmapStore.selectedRoadmap;
    if (!currentRoadmap || !stage) return;
    
    const progress = $currentProgress;
    
    // Create context for the specific stage
    const context = {
      type: 'roadmap',
      roadmap: currentRoadmap.name,
      stage: stage.title,
      stageDescription: stage.description,
      completedStages: progress?.completed_stages || 0,
      totalStages: progress?.total_stages || currentRoadmap.stages.length,
      prompt: `Help me with this practice prompt: "${stage.practicePrompt}"`,
      difficulty: currentRoadmap.difficulty,
      estimatedTime: stage.estimatedTime,
      resources: stage.resources,
      learningObjectives: stage.learningObjectives
    };
    
    // Open chat panel with context
    chatPanel.openWithContext(context);
    
    showToast(`Context loaded for "${stage.title}"! AI chat opened.`, 'success');
  }
</script>

{#if !$isAuthenticated}
  <!-- Authentication Required -->
  <div class="card-zen">
    <div class="text-center py-8">
      <div class="text-4xl mb-4">🔐</div>
      <h2 class="text-xl font-semibold text-gray-800 mb-2">Authentication Required</h2>
      <p class="text-gray-600 mb-4">The Roadmap feature requires you to be signed in to save your progress.</p>
      <a href="/login" class="btn-primary">Sign In to Continue</a>
    </div>
  </div>
{:else}
<div class="space-y-3">
  {#if $roadmapStore.loading}
    <!-- Loading State -->
    <div class="space-y-4">
      <div class="h-8 w-48 bg-gray-200 rounded animate-pulse"></div>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {#each Array(4) as _}
          <div class="h-48 bg-gray-200 rounded-lg animate-pulse"></div>
        {/each}
      </div>
    </div>
  
  {:else if $roadmapStore.error}
    <!-- Error State -->
    <div class="card-zen bg-red-50 border-red-200">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-red-500 text-lg">⚠️</span>
        <h3 class="font-medium text-red-800">Failed to Load Roadmaps</h3>
      </div>
      <p class="text-red-600 text-sm mb-4">{$roadmapStore.error}</p>
      <button 
        class="btn-primary" 
        on:click={() => roadmapStore.loadRoadmaps()}
      >
        Try Again
      </button>
    </div>
  
  {:else if selectedView === 'overview'}
    <!-- Roadmap Selection View -->
    <div>
      <h1 class="text-2xl font-semibold">AI/ML Learning Roadmaps</h1>
      <p class="text-gray-600 mt-1">
        Select a structured learning path to master AI/ML concepts
      </p>
    </div>

    <!-- Compact Statistics Overview -->
    {#if statistics && (statistics.roadmapsStarted > 0 || statistics.totalStagesCompleted > 0)}
      <div class="card-zen p-3 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <h2 class="font-medium text-sm mb-2 text-gray-700">📊 Learning Progress</h2>
        <div class="grid grid-cols-4 gap-3">
          <div class="text-center">
            <div class="text-lg font-bold text-blue-600">{statistics.roadmapsStarted}</div>
            <div class="text-xs text-gray-600">Started</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-green-600">{statistics.roadmapsCompleted}</div>
            <div class="text-xs text-gray-600">Completed</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-purple-600">{statistics.totalStagesCompleted}</div>
            <div class="text-xs text-gray-600">Stages</div>
          </div>
          <div class="text-center">
            <div class="text-lg font-bold text-orange-600">{Math.round(statistics.averageCompletion)}%</div>
            <div class="text-xs text-gray-600">Avg</div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Compact Search and Filters -->
    <div class="card-zen p-3">
      <div class="flex gap-3">
        <div class="flex-1">
          <input
            type="text"
            bind:value={searchTerm}
            placeholder="Search roadmaps..."
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div class="w-40">
          <select 
            bind:value={filterDifficulty}
            class="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {#each difficulties as difficulty}
              <option value={difficulty}>
                {difficulty === 'all' ? 'All' : difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
              </option>
            {/each}
          </select>
        </div>
      </div>
    </div>

    <!-- Roadmap Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {#if filteredRoadmaps.length === 0}
        <div class="col-span-full card-zen text-center py-8">
          <p class="text-gray-500 text-sm">No roadmaps match your search criteria.</p>
        </div>
      {:else}
        {#each filteredRoadmaps as roadmap}
          {@const roadmapProgress = $roadmapStore.progress[roadmap.id] || { completed_stages: 0, total_stages: roadmap.stages?.length || 0, percentage: 0, is_completed: false }}
          <button
            class="card-zen text-left w-full transition-all hover:shadow-md {$roadmapStore.selectedRoadmap?.id === roadmap.id ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}"
            on:click={() => selectRoadmap(roadmap)}
          >
            <div class="flex items-start justify-between mb-3">
              <div class="flex items-center gap-3">
                <span class="text-3xl">{roadmap.icon}</span>
                <div>
                  <h3 class="font-semibold text-lg text-gray-800">{roadmap.name}</h3>
                  <p class="text-sm text-gray-600 mt-1">
                    {roadmap.stages?.length || 0} stages • ~{roadmap.estimated_hours}h
                  </p>
                </div>
              </div>
              
              {#if roadmapProgress.percentage === 100}
                <span class="flex items-center gap-1 text-green-600 text-sm font-medium">
                  <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                  </svg>
                  Completed
                </span>
              {/if}
            </div>
            
            <p class="text-sm text-gray-600 mb-4 line-clamp-2">
              {roadmap.description}
            </p>
            
            <div class="space-y-3">
              <!-- Difficulty Badge -->
              <div class="flex items-center gap-2">
                <span class="text-xs font-medium px-2 py-1 rounded border {getDifficultyColor(roadmap.difficulty)}">
                  {roadmap.difficulty.charAt(0).toUpperCase() + roadmap.difficulty.slice(1)}
                </span>
                {#if roadmap.tags && roadmap.tags.length > 0}
                  <div class="flex flex-wrap gap-1">
                    {#each roadmap.tags.slice(0, 3) as tag}
                      <span class="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                        {tag}
                      </span>
                    {/each}
                  </div>
                {/if}
              </div>
              
              <!-- Progress Bar -->
              {#if roadmapProgress.completed_stages > 0}
                <div>
                  <div class="flex justify-between text-xs text-gray-600 mb-1">
                    <span>Progress</span>
                    <span>{roadmapProgress.percentage}%</span>
                  </div>
                  <div class="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div 
                      class="h-full rounded-full transition-all duration-500 ease-out {roadmapProgress.percentage === 100 ? 'bg-green-500' : 'bg-blue-500'}"
                      style="width: {roadmapProgress.percentage}%"
                    />
                  </div>
                  <p class="text-xs text-gray-500 mt-1">
                    {roadmapProgress.completed_stages} of {roadmapProgress.total_stages} stages completed
                  </p>
                </div>
              {:else}
                <p class="text-xs text-gray-500">
                  Ready to start • {roadmap.stages?.length || 0} stages to master
                </p>
              {/if}
            </div>
          </button>
        {/each}
      {/if}
    </div>
  
  {:else if $roadmapStore.selectedRoadmap}
    <!-- Detailed Roadmap View -->
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div class="flex items-center gap-3">
          <button
            on:click={() => selectedView = 'overview'}
            class="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to roadmaps"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 class="text-2xl font-semibold flex items-center gap-2">
              <span>{$roadmapStore.selectedRoadmap.icon}</span>
              {$roadmapStore.selectedRoadmap.name}
            </h1>
            <p class="text-gray-600 text-sm">
              {$roadmapStore.selectedRoadmap.description}
            </p>
          </div>
        </div>
        
        <div class="flex items-center gap-2">
          <button 
            class="text-sm text-red-600 hover:text-red-800 transition-colors"
            on:click={resetProgress}
            title="Reset progress for this roadmap"
          >
            Reset Progress
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <!-- Main Content -->
        <div class="lg:col-span-3 space-y-3">
          <!-- Compact Progress Overview -->
          {#if $currentProgress}
            <div class="card-zen p-3 bg-gradient-to-r from-blue-50 to-green-50 border-blue-200">
              <div class="flex items-center justify-between mb-2">
                <h2 class="font-medium text-sm text-gray-800">Progress</h2>
                <span class="text-xs text-gray-600">
                  {$currentProgress?.completed_stages || 0}/{$currentProgress?.total_stages || 0} stages ({$currentProgress?.percentage || 0}%)
                </span>
              </div>
              <div class="w-full bg-gray-200 rounded-full h-2">
                <div 
                  class="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full transition-all duration-500"
                  style="width: {$currentProgress?.percentage || 0}%"
                />
              </div>
            </div>

            <!-- Compact Next Stage -->
            {#if $roadmapStore.selectedRoadmap && $currentProgress}
              {@const nextStage = getNextStage()}
              {#if nextStage}
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                <div class="flex items-center gap-2 text-yellow-800 text-xs">
                  <span>🎯</span>
                  <span class="font-medium">Next: {nextStage.title}</span>
                  <span class="text-yellow-600">({nextStage.estimatedTime})</span>
                </div>
              </div>
              {:else}
              <div class="bg-green-50 border border-green-200 rounded-lg p-2">
                <div class="flex items-center gap-2 text-green-800 text-xs">
                  <span>🎉</span>
                  <span class="font-medium">Roadmap completed!</span>
                </div>
              </div>
              {/if}
            {/if}
          {/if}

          <!-- Compact Stages -->
          <div class="space-y-2">
            <h3 class="font-medium text-sm text-gray-700">Learning Stages</h3>
            
            {#each $roadmapStore.selectedRoadmap.stages as stage, index}
              {@const stageProgress = getCurrentStageProgress(index)}
              <div class="card-zen p-3 transition-all duration-200 {stageProgress.completed ? 'bg-green-50 border-green-200' : 'hover:bg-gray-50'}">
                <!-- Compact Stage Header -->
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0 pt-0.5">
                    <input 
                      type="checkbox"
                      checked={stageProgress.completed}
                      on:change={() => toggleStage(index)}
                      class="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <!-- Compact Stage Title and Info -->
                    <div class="flex items-start justify-between">
                      <div class="flex-1">
                        <h4 class="font-medium text-sm text-gray-900 flex items-center gap-2">
                          <span>{index + 1}. {stage.title}</span>
                          {#if stageProgress.hasNote}
                            <span class="text-blue-500 text-xs" title="Has notes">📝</span>
                          {/if}
                        </h4>
                        <p class="text-xs text-gray-600 mt-0.5 line-clamp-2">{stage.description}</p>
                        {#if stage.estimatedTime}
                          <p class="text-xs text-gray-500 mt-1">
                            ⏱️ {formatEstimatedTime(stage.estimatedTime)}
                          </p>
                        {/if}
                      </div>
                      
                      <div class="flex items-center gap-1 ml-3">
                        <button
                          on:click={() => openNoteModal(stage.id)}
                          class="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Add note"
                        >
                          <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        
                        <button
                          on:click={() => toggleStageExpansion(index)}
                          class="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          <svg 
                            class="w-3 h-3 transform transition-transform {expandedStages.has(index) ? 'rotate-180' : ''}" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    <!-- Compact Expanded Content -->
                    {#if expandedStages.has(index)}
                      <div class="mt-2 space-y-2">
                        <!-- Compact Learning Objectives -->
                        {#if stage.learningObjectives && stage.learningObjectives.length > 0}
                          <div>
                            <h5 class="font-medium text-xs text-gray-700 mb-1">Learning Objectives:</h5>
                            <ul class="space-y-0.5">
                              {#each stage.learningObjectives as objective}
                                <li class="flex items-start gap-1 text-xs text-gray-600">
                                  <span class="text-blue-500 mt-0.5">•</span>
                                  <span>{objective}</span>
                                </li>
                              {/each}
                            </ul>
                          </div>
                        {/if}

                        <!-- Resources -->
                        {#if stage.resources && stage.resources.length > 0}
                          <div>
                            <h5 class="font-medium text-sm text-gray-700 mb-2">Resources:</h5>
                            <div class="space-y-2">
                              {#each stage.resources as resource}
                                <a
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="flex items-start gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors group"
                                >
                                  <span class="text-lg flex-shrink-0">
                                    {getResourceIcon(resource.type)}
                                  </span>
                                  <div class="flex-1 min-w-0">
                                    <p class="font-medium text-sm text-blue-600 group-hover:underline">
                                      {resource.title}
                                    </p>
                                    {#if resource.description}
                                      <p class="text-xs text-gray-600 mt-0.5">
                                        {resource.description}
                                      </p>
                                    {/if}
                                  </div>
                                  <svg class="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              {/each}
                            </div>
                          </div>
                        {/if}

                        <!-- Practice Prompt -->
                        {#if stage.practicePrompt}
                          <div class="p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <h5 class="font-medium text-sm text-blue-800 mb-1">💡 Practice Project:</h5>
                            <p class="text-sm text-blue-700">{stage.practicePrompt}</p>
                            <button
                              on:click={() => askAIForStageHelp(index, stage)}
                              class="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-1"
                            >
                              <span>💬</span>
                              Ask AI about this
                            </button>
                          </div>
                        {/if}
                      </div>
                    {/if}
                  </div>
                </div>
              </div>
            {/each}
          </div>
        </div>
        
        <!-- Sidebar -->
        <div class="space-y-6">
          <!-- Quick Actions -->
          <div class="card-zen">
            <h3 class="font-semibold mb-3">Quick Actions</h3>
            <div class="space-y-2">
              <button
                on:click={askAIForHelp}
                class="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                <span class="text-lg">💬</span>
                <div>
                  <p class="font-medium text-sm">Ask AI for Help</p>
                  <p class="text-xs text-gray-600">Get guidance on current stage</p>
                </div>
              </button>
              
              <button
                on:click={() => {
                  const notes = `# ${$roadmapStore.selectedRoadmap.name} Progress\n\n` +
                    `Completed: ${$currentProgress?.completed_stages || 0}/${$currentProgress?.total_stages || 0} stages\n\n` +
                    $roadmapStore.selectedRoadmap.stages.map((stage, i) => 
                      `${getCurrentStageProgress(i).completed ? '✅' : '⬜'} ${stage.title}`
                    ).join('\n');
                  
                  navigator.clipboard.writeText(notes);
                  showToast('Progress copied to clipboard!');
                }}
                class="w-full text-left p-3 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3"
              >
                <span class="text-lg">📋</span>
                <div>
                  <p class="font-medium text-sm">Export Progress</p>
                  <p class="text-xs text-gray-600">Copy as markdown</p>
                </div>
              </button>
            </div>
          </div>
          
          <!-- Learning Tips -->
          <div class="card-zen bg-blue-50 border-blue-200">
            <h3 class="font-semibold text-blue-900 mb-2">💡 Learning Tips</h3>
            <ul class="space-y-2 text-sm text-blue-800">
              <li class="flex items-start gap-2">
                <span class="text-blue-500 mt-0.5">•</span>
                <span>Focus on understanding, not just completing stages</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-blue-500 mt-0.5">•</span>
                <span>Build projects with each new concept you learn</span>
              </li>
              <li class="flex items-start gap-2">
                <span class="text-blue-500 mt-0.5">•</span>
                <span>Take notes and review them regularly</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<!-- Note Modal -->
{#if showNoteModal}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4">
      <button class="fixed inset-0 bg-black bg-opacity-50 transition-opacity" on:click={() => showNoteModal = false} aria-label="Close modal"></button>
      
      <div class="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
        <div class="p-6">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold">Add Stage Note</h3>
            <button
              on:click={() => showNoteModal = false}
              class="text-gray-400 hover:text-gray-600"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <textarea
            bind:value={noteContent}
            placeholder="Add your thoughts, insights, or questions about this stage..."
            rows="4"
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          ></textarea>
          
          <div class="flex justify-end gap-3 mt-4">
            <button
              on:click={() => showNoteModal = false}
              class="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              on:click={saveNote}
              class="btn-primary"
            >
              Save Note
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Toast Notification -->
{#if showingToast}
  <div class="fixed bottom-4 right-4 z-50 {toastType === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white px-4 py-2 rounded-lg shadow-lg transition-all">
    {toastMessage}
  </div>
{/if}
{/if}

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>