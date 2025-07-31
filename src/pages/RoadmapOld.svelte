<script>
  import { onMount } from 'svelte';
  import { getAllRoadmaps, getRoadmapById, getDifficultyColor, getResourceIcon } from '../lib/roadmapData.js';
  import { ProgressTracker } from '../lib/progressTracker.js';
  
  export let userId;
  
  let roadmaps = [];
  let selectedRoadmap = null;
  let progress = null;
  let progressTracker = null;
  let loading = true;
  let showNoteModal = false;
  let noteStageId = '';
  let noteContent = '';
  let filterDifficulty = 'all';
  let searchTerm = '';
  let expandedStages = new Set();
  let showStatistics = false;
  let statistics = null;
  let allProgress = {};

  const difficulties = ['all', 'Beginner', 'Intermediate', 'Advanced'];
  
  // Initialize all progress when roadmaps are loaded
  function initializeAllProgress() {
    if (!progressTracker || !roadmaps.length) return;
    
    allProgress = {};
    roadmaps.forEach(roadmap => {
      const roadmapProgress = progressTracker.getProgress(roadmap.id);
      roadmapProgress.totalStages = roadmap.stages.length;
      roadmapProgress.completionPercentage = Math.floor((roadmapProgress.completedStages.length / roadmap.stages.length) * 100);
      allProgress[roadmap.id] = roadmapProgress;
    });
  }

  onMount(() => {
    progressTracker = new ProgressTracker(userId);
    loadRoadmaps();
    loading = false;
  });

  function loadRoadmaps() {
    roadmaps = getAllRoadmaps();
    
    // Initialize progress tracking for all roadmaps
    initializeAllProgress();
    
    // Auto-select first roadmap if none selected
    if (roadmaps.length > 0 && !selectedRoadmap) {
      selectRoadmap(roadmaps[0]);
    }
    
    // Load statistics
    statistics = progressTracker.getStatistics();
  }

  function selectRoadmap(roadmap) {
    selectedRoadmap = roadmap;
    progress = progressTracker.getProgress(roadmap.id);
    
    // Update progress with current roadmap data
    progress.totalStages = roadmap.stages.length;
    progress.completionPercentage = Math.floor((progress.completedStages.length / roadmap.stages.length) * 100);
    
    // Save updated progress
    progressTracker.saveProgress(roadmap.id, progress);
    
    // Clear expanded stages when switching roadmaps
    expandedStages.clear();
    expandedStages = expandedStages;
  }

  function toggleStage(stageId) {
    if (!selectedRoadmap || !progressTracker) return;
    
    // Toggle the stage in the progress tracker
    progress = progressTracker.toggleStage(selectedRoadmap.id, stageId);
    
    // Ensure completion percentage is recalculated with current roadmap data
    progress.totalStages = selectedRoadmap.stages.length;
    progress.completionPercentage = Math.floor((progress.completedStages.length / selectedRoadmap.stages.length) * 100);
    
    // Save the updated progress to localStorage
    progressTracker.saveProgress(selectedRoadmap.id, progress);
    
    // Update allProgress for the current roadmap to trigger sidebar updates
    allProgress[selectedRoadmap.id] = { ...progress };
    
    // Force reactivity by reassigning both objects
    progress = { ...progress };
    allProgress = { ...allProgress };
    
    // Update statistics
    statistics = progressTracker.getStatistics();
    
    // Show achievement notification with correct logic
    const isNowCompleted = progress.completedStages.includes(stageId);
    showToast(`Stage ${isNowCompleted ? 'completed' : 'unchecked'}!`);
  }

  function toggleStageExpansion(stageId) {
    if (expandedStages.has(stageId)) {
      expandedStages.delete(stageId);
    } else {
      expandedStages.add(stageId);
    }
    expandedStages = expandedStages;
  }

  function openNoteModal(stageId) {
    noteStageId = stageId;
    noteContent = progressTracker.getStageNote(selectedRoadmap.id, stageId);
    showNoteModal = true;
  }

  function saveNote() {
    if (noteStageId && selectedRoadmap) {
      progressTracker.addStageNote(selectedRoadmap.id, noteStageId, noteContent);
      showToast('Note saved!');
    }
    closeNoteModal();
  }

  function closeNoteModal() {
    showNoteModal = false;
    noteStageId = '';
    noteContent = '';
  }

  function resetProgress() {
    if (!selectedRoadmap || !confirm('Are you sure you want to reset all progress for this roadmap?')) {
      return;
    }
    
    // Reset in localStorage
    progressTracker.resetProgress(selectedRoadmap.id);
    
    // Get fresh empty progress
    progress = progressTracker.getProgress(selectedRoadmap.id);
    progress.totalStages = selectedRoadmap.stages.length;
    progress.completionPercentage = 0;
    progress.completedStages = []; // Ensure empty array
    
    // Save to localStorage
    progressTracker.saveProgress(selectedRoadmap.id, progress);
    
    // Update allProgress for sidebar
    allProgress[selectedRoadmap.id] = { ...progress };
    
    // Force complete reactivity - this should trigger checkbox updates
    progress = { ...progress };
    allProgress = { ...allProgress };
    
    // Update statistics
    statistics = progressTracker.getStatistics();
    
    showToast('Progress reset successfully');
  }

  function exportProgress() {
    try {
      const data = progressTracker.exportProgress();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `learningos_progress_${userId}_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      showToast('Progress exported successfully!');
    } catch (error) {
      showToast('Failed to export progress', 'error');
    }
  }

  // Filter roadmaps based on search and difficulty
  $: filteredRoadmaps = roadmaps.filter(roadmap => {
    // Difficulty filter
    if (filterDifficulty !== 'all' && roadmap.difficulty !== filterDifficulty) {
      return false;
    }
    
    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      return roadmap.name.toLowerCase().includes(searchLower) ||
             roadmap.description.toLowerCase().includes(searchLower) ||
             roadmap.tags.some(tag => tag.toLowerCase().includes(searchLower));
    }
    
    return true;
  });

  function getStageProgress(stageId) {
    if (!progress) return { completed: false, hasNote: false };
    
    return {
      completed: progress.completedStages.includes(stageId),
      hasNote: progressTracker.getStageNote(selectedRoadmap.id, stageId).length > 0
    };
  }

  function formatEstimatedTime(time) {
    return time || 'Variable';
  }

  function getNextStage() {
    if (!selectedRoadmap || !progress) return null;
    
    for (const stage of selectedRoadmap.stages) {
      if (!progress.completedStages.includes(stage.id)) {
        return stage;
      }
    }
    return null; // All stages completed
  }

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
</script>

<div class="space-y-6">
  <!-- Header with Statistics Toggle -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold">Learning Roadmaps</h1>
      <p class="text-sm text-zen-gray-500 mt-1">
        Structured learning paths for AI/ML mastery
      </p>
    </div>
    
    <div class="flex gap-2">
      <button 
        class="px-3 py-2 text-sm text-zen-gray-600 hover:text-zen-gray-800 border border-zen-gray-300 rounded-lg hover:bg-zen-gray-50 transition-colors"
        on:click={() => showStatistics = !showStatistics}
      >
        {showStatistics ? 'Hide Stats' : 'Show Stats'}
      </button>
      
      <button 
        class="px-3 py-2 text-sm text-zen-gray-600 hover:text-zen-gray-800 border border-zen-gray-300 rounded-lg hover:bg-zen-gray-50 transition-colors"
        on:click={exportProgress}
      >
        Export Progress
      </button>
    </div>
  </div>

  <!-- Statistics Panel -->
  {#if showStatistics && statistics}
    <div class="card-zen bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
      <h3 class="font-semibold text-blue-800 mb-4">📊 Your Learning Statistics</h3>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center">
          <div class="text-2xl font-bold text-blue-600">{statistics.roadmapsStarted}</div>
          <div class="text-sm text-zen-gray-600">Roadmaps Started</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-green-600">{statistics.roadmapsCompleted}</div>
          <div class="text-sm text-zen-gray-600">Completed</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-purple-600">{statistics.totalStagesCompleted}</div>
          <div class="text-sm text-zen-gray-600">Stages Done</div>
        </div>
        <div class="text-center">
          <div class="text-2xl font-bold text-orange-600">{Math.round(statistics.averageCompletion)}%</div>
          <div class="text-sm text-zen-gray-600">Avg Progress</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Search and Filters -->
  <div class="card-zen">
    <div class="flex flex-col sm:flex-row gap-4">
      <div class="flex-1">
        <input
          type="text"
          bind:value={searchTerm}
          placeholder="Search roadmaps by name, description, or tags..."
          class="w-full px-4 py-2 border border-zen-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      <div class="sm:w-48">
        <select 
          bind:value={filterDifficulty}
          class="w-full px-3 py-2 border border-zen-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {#each difficulties as difficulty}
            <option value={difficulty}>
              {difficulty === 'all' ? 'All Difficulties' : difficulty}
            </option>
          {/each}
        </select>
      </div>
    </div>
  </div>

  <div class="grid lg:grid-cols-3 gap-6">
    <!-- Roadmap List -->
    <div class="lg:col-span-1 space-y-4">
      <h2 class="font-semibold text-zen-gray-700">Available Roadmaps</h2>
      
      {#if loading}
        <div class="space-y-3">
          {#each Array(3) as _}
            <div class="card-zen loading h-24"></div>
          {/each}
        </div>
      {:else if filteredRoadmaps.length === 0}
        <div class="card-zen text-center py-8">
          <p class="text-zen-gray-500 text-sm">No roadmaps match your criteria.</p>
        </div>
      {:else}
        {#each filteredRoadmaps as roadmap}
          {@const roadmapProgress = allProgress[roadmap.id] || { completedStages: [], totalStages: roadmap.stages.length, completionPercentage: 0 }}
          <button
            class="card-zen text-left w-full transition-all hover:shadow-md {selectedRoadmap?.id === roadmap.id ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}"
            on:click={() => selectRoadmap(roadmap)}
          >
            <div class="flex items-start justify-between mb-2">
              <h3 class="font-medium text-zen-gray-800">{roadmap.name}</h3>
              <span class="text-xs px-2 py-1 rounded-full border {getDifficultyColor(roadmap.difficulty)}">
                {roadmap.difficulty}
              </span>
            </div>
            
            <p class="text-sm text-zen-gray-600 mb-3">{roadmap.description}</p>
            
            <!-- Progress Bar -->
            <div class="mb-2">
              <div class="flex justify-between text-xs text-zen-gray-500 mb-1">
                <span>Progress</span>
                <span>{roadmapProgress.completedStages.length}/{roadmap.stages.length}</span>
              </div>
              <div class="w-full bg-zen-gray-200 rounded-full h-1.5">
                <div 
                  class="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                  style="width: {roadmapProgress.completionPercentage || 0}%"
                />
              </div>
            </div>
            
            <div class="flex items-center justify-between text-xs text-zen-gray-500">
              <span>⏱️ {roadmap.estimatedTime}</span>
              <span>{roadmap.stages.length} stages</span>
            </div>
          </button>
        {/each}
      {/if}
    </div>

    <!-- Selected Roadmap Details -->
    <div class="lg:col-span-2">
      {#if selectedRoadmap && progress}
        <div class="space-y-6">
          <!-- Roadmap Header -->
          <div class="card-zen">
            <div class="flex items-start justify-between mb-4">
              <div class="flex-1">
                <div class="flex items-center gap-3 mb-2">
                  <h2 class="text-xl font-semibold">{selectedRoadmap.name}</h2>
                  <span class="text-sm px-2 py-1 rounded-full border {getDifficultyColor(selectedRoadmap.difficulty)}">
                    {selectedRoadmap.difficulty}
                  </span>
                </div>
                <p class="text-zen-gray-600 mb-3">{selectedRoadmap.description}</p>
                
                <!-- Tags -->
                <div class="flex flex-wrap gap-2 mb-4">
                  {#each selectedRoadmap.tags as tag}
                    <span class="text-xs bg-zen-gray-100 text-zen-gray-700 px-2 py-1 rounded-full">
                      {tag}
                    </span>
                  {/each}
                </div>
              </div>
              
              <button 
                class="text-sm text-red-600 hover:text-red-800 transition-colors"
                on:click={resetProgress}
                title="Reset progress for this roadmap"
              >
                Reset Progress
              </button>
            </div>

            <!-- Overall Progress -->
            <div class="mb-4">
              <div class="flex justify-between text-sm text-zen-gray-600 mb-2">
                <span>Overall Progress</span>
                <span>{progress.completedStages.length}/{selectedRoadmap.stages.length} stages ({progress.completionPercentage}%)</span>
              </div>
              <div class="w-full bg-zen-gray-200 rounded-full h-3">
                <div 
                  class="bg-gradient-to-r from-blue-500 to-green-500 h-3 rounded-full transition-all duration-500"
                  style="width: {progress.completionPercentage}%"
                />
              </div>
            </div>

            <!-- Next Stage Suggestion -->
            {#if selectedRoadmap && progress}
              {@const nextStage = getNextStage()}
              {#if nextStage}
              <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div class="flex items-center gap-2 text-yellow-800 text-sm">
                  <span>🎯</span>
                  <span class="font-medium">Next up: {nextStage.title}</span>
                  <span class="text-yellow-600">({nextStage.estimatedTime})</span>
                </div>
              </div>
            {:else}
              <div class="bg-green-50 border border-green-200 rounded-lg p-3">
                <div class="flex items-center gap-2 text-green-800 text-sm">
                  <span>🎉</span>
                  <span class="font-medium">Congratulations! You've completed this roadmap!</span>
                </div>
              </div>
            {/if}
            {/if}
          </div>

          <!-- Stages -->
          <div class="space-y-4">
            <h3 class="font-semibold text-zen-gray-700">Learning Stages</h3>
            
            {#each selectedRoadmap.stages as stage, index}
              {@const stageProgress = getStageProgress(stage.id)}
              <div class="card-zen transition-all duration-200 {stageProgress.completed ? 'bg-green-50 border-green-200' : ''}">
                <!-- Stage Header -->
                <div class="flex items-start gap-4">
                  <div class="flex-shrink-0 pt-1">
                    <input 
                      type="checkbox"
                      checked={stageProgress.completed}
                      on:change={() => toggleStage(stage.id)}
                      class="h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <!-- Stage Title and Info -->
                    <div class="flex items-start justify-between mb-2">
                      <div class="flex-1">
                        <h4 class="font-medium text-zen-gray-900 flex items-center gap-2">
                          <span>{index + 1}. {stage.title}</span>
                          {#if stageProgress.hasNote}
                            <span class="text-blue-500" title="Has notes">📝</span>
                          {/if}
                        </h4>
                        <div class="flex items-center gap-4 mt-1 text-sm text-zen-gray-500">
                          <span>⏱️ {formatEstimatedTime(stage.estimatedTime)}</span>
                          <span>📚 {stage.resources?.length || 0} resources</span>
                        </div>
                      </div>
                      
                      <div class="flex gap-2">
                        <button
                          on:click={() => openNoteModal(stage.id)}
                          class="text-zen-gray-400 hover:text-blue-600 transition-colors"
                          title="Add/edit notes"
                        >
                          📝
                        </button>
                        <button
                          on:click={() => toggleStageExpansion(stage.id)}
                          class="text-zen-gray-400 hover:text-zen-gray-600 transition-colors"
                        >
                          {expandedStages.has(stage.id) ? '▼' : '▶️'}
                        </button>
                      </div>
                    </div>
                    
                    <p class="text-sm text-zen-gray-600 mb-3">{stage.description}</p>

                    <!-- Expanded Content -->
                    {#if expandedStages.has(stage.id)}
                      <div class="border-t border-zen-gray-100 pt-4 mt-4 space-y-4">
                        <!-- Learning Objectives -->
                        {#if stage.learningObjectives?.length > 0}
                          <div>
                            <h5 class="font-medium text-zen-gray-800 mb-2">🎯 Learning Objectives</h5>
                            <ul class="text-sm text-zen-gray-600 space-y-1 ml-4">
                              {#each stage.learningObjectives as objective}
                                <li class="list-disc">{objective}</li>
                              {/each}
                            </ul>
                          </div>
                        {/if}

                        <!-- Prerequisites -->
                        {#if stage.prerequisites?.length > 0}
                          <div>
                            <h5 class="font-medium text-zen-gray-800 mb-2">📋 Prerequisites</h5>
                            <div class="flex flex-wrap gap-2">
                              {#each stage.prerequisites as prereq}
                                <span class="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full">
                                  {prereq}
                                </span>
                              {/each}
                            </div>
                          </div>
                        {/if}

                        <!-- Resources -->
                        {#if stage.resources?.length > 0}
                          <div>
                            <h5 class="font-medium text-zen-gray-800 mb-2">📚 Resources</h5>
                            <div class="grid gap-2">
                              {#each stage.resources as resource}
                                <a 
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  class="flex items-start gap-3 p-3 bg-zen-gray-50 rounded-lg hover:bg-zen-gray-100 transition-colors group"
                                >
                                  <span class="text-lg flex-shrink-0">{getResourceIcon(resource.type)}</span>
                                  <div class="flex-1 min-w-0">
                                    <div class="font-medium text-blue-600 group-hover:underline text-sm">
                                      {resource.title}
                                    </div>
                                    {#if resource.description}
                                      <div class="text-xs text-zen-gray-600 mt-1">
                                        {resource.description}
                                      </div>
                                    {/if}
                                  </div>
                                  <span class="text-xs bg-white px-2 py-1 rounded border text-zen-gray-500">
                                    {resource.type}
                                  </span>
                                </a>
                              {/each}
                            </div>
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
      {:else}
        <div class="card-zen text-center py-12">
          <div class="text-4xl mb-4">🗺️</div>
          <p class="text-zen-gray-500">Select a roadmap to start your learning journey</p>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Note Modal -->
{#if showNoteModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
    <div class="bg-white rounded-lg max-w-md w-full p-6">
      <h3 class="font-semibold mb-4">Stage Notes</h3>
      <textarea
        bind:value={noteContent}
        placeholder="Add your notes, insights, or questions about this stage..."
        class="w-full h-32 p-3 border border-zen-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      ></textarea>
      <div class="flex justify-end gap-2 mt-4">
        <button 
          class="px-4 py-2 text-zen-gray-600 hover:text-zen-gray-800 transition-colors"
          on:click={closeNoteModal}
        >
          Cancel
        </button>
        <button 
          class="btn-primary"
          on:click={saveNote}
        >
          Save Note
        </button>
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