<script>
  import { createEventDispatcher, onDestroy } from 'svelte';
  
  export let mood = null;
  export let energyLevel = null;
  export let learningMinutes = 0;
  export let focusSessions = 0;
  export let loading = false;
  
  const dispatch = createEventDispatcher();
  
  // Focus session timer state
  let isSessionActive = false;
  let sessionStartTime = null;
  let sessionTimer = null;
  let sessionDuration = 0; // in seconds
  
  const moods = [
    { key: 'amazing', emoji: '🤩', label: 'Amazing', color: 'text-green-600' },
    { key: 'good', emoji: '😊', label: 'Good', color: 'text-blue-600' },
    { key: 'okay', emoji: '😐', label: 'Okay', color: 'text-yellow-600' },
    { key: 'struggling', emoji: '😔', label: 'Struggling', color: 'text-orange-600' }
  ];
  
  function setMood(newMood) {
    dispatch('updateMood', { mood: newMood, energyLevel });
  }
  
  function setEnergyLevel(level) {
    dispatch('updateMood', { mood, energyLevel: level });
  }
  
  function toggleFocusSession() {
    if (isSessionActive) {
      // End session
      stopFocusSession();
    } else {
      // Start session
      startFocusSession();
    }
  }
  
  function startFocusSession() {
    isSessionActive = true;
    sessionStartTime = Date.now();
    sessionDuration = 0;
    
    // Update timer every second
    sessionTimer = setInterval(() => {
      sessionDuration = Math.floor((Date.now() - sessionStartTime) / 1000);
    }, 1000);
  }
  
  function stopFocusSession() {
    if (sessionTimer) {
      clearInterval(sessionTimer);
      sessionTimer = null;
    }
    
    const minutes = Math.floor(sessionDuration / 60);
    
    // Add the session and learning time
    dispatch('addFocusSession');
    if (minutes > 0) {
      dispatch('addLearningTime', { minutes });
    }
    
    // Reset state
    isSessionActive = false;
    sessionStartTime = null;
    sessionDuration = 0;
  }
  
  function formatSessionTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  function addLearningTime(minutes) {
    dispatch('addLearningTime', { minutes });
  }
  
  // Quick time presets
  const timePresets = [15, 30, 60, 120];
  
  // Cleanup timer on component destroy
  onDestroy(() => {
    if (sessionTimer) {
      clearInterval(sessionTimer);
    }
  });
</script>

<div class="mood-energy-container space-y-6">
  <!-- Mood Selection -->
  <div>
    <h4 class="text-sm font-medium text-zen-gray-700 mb-3">How are you feeling today?</h4>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
      {#each moods as moodOption}
        <button
          on:click={() => setMood(moodOption.key)}
          disabled={loading}
          class="p-3 rounded-lg border-2 transition-all hover:scale-105
                 {mood === moodOption.key 
                   ? 'border-blue-500 bg-blue-50' 
                   : 'border-zen-gray-200 hover:border-zen-gray-300'}"
        >
          <div class="text-2xl mb-1">{moodOption.emoji}</div>
          <div class="text-xs font-medium {moodOption.color}">{moodOption.label}</div>
        </button>
      {/each}
    </div>
  </div>

  <!-- Energy Level -->
  <div>
    <h4 class="text-sm font-medium text-zen-gray-700 mb-3">Energy Level</h4>
    <div class="flex items-center gap-2">
      <span class="text-xs text-zen-gray-500">Low</span>
      <div class="flex gap-1">
        {#each [1, 2, 3, 4, 5] as level}
          <button
            on:click={() => setEnergyLevel(level)}
            disabled={loading}
            class="w-8 h-8 rounded-full border-2 transition-all
                   {energyLevel >= level 
                     ? 'bg-gradient-to-r from-orange-400 to-red-500 border-orange-500' 
                     : 'border-zen-gray-300 hover:border-orange-300'}"
          >
            {#if energyLevel >= level}
              <div class="w-full h-full rounded-full bg-white opacity-30"></div>
            {/if}
          </button>
        {/each}
      </div>
      <span class="text-xs text-zen-gray-500">High</span>
      {#if energyLevel}
        <span class="ml-2 text-sm font-medium text-zen-gray-700">{energyLevel}/5</span>
      {/if}
    </div>
  </div>

  <!-- Learning Time Tracker -->
  <div>
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-medium text-zen-gray-700">Learning Time</h4>
      <div class="text-sm text-zen-gray-600">
        {learningMinutes} minutes today
      </div>
    </div>
    
    <!-- Quick time buttons -->
    <div class="flex flex-wrap gap-2 mb-3">
      {#each timePresets as minutes}
        <button
          on:click={() => addLearningTime(minutes)}
          disabled={loading}
          class="px-3 py-1 text-xs bg-zen-gray-100 hover:bg-zen-gray-200 
                 rounded-full transition-colors disabled:opacity-50"
        >
          +{minutes}m
        </button>
      {/each}
    </div>
    
    <!-- Learning time visualization -->
    <div class="relative">
      <div class="w-full bg-zen-gray-200 rounded-full h-3">
        <div 
          class="bg-gradient-to-r from-purple-400 to-purple-600 h-3 rounded-full transition-all duration-500"
          style="width: {Math.min(100, (learningMinutes / 120) * 100)}%"
        ></div>
      </div>
      <div class="flex justify-between text-xs text-zen-gray-500 mt-1">
        <span>0m</span>
        <span class="text-zen-gray-700 font-medium">{learningMinutes}m</span>
        <span>2h goal</span>
      </div>
    </div>
  </div>

  <!-- Focus Sessions -->
  <div>
    <div class="flex items-center justify-between mb-3">
      <h4 class="text-sm font-medium text-zen-gray-700">Focus Sessions</h4>
      <div class="text-sm text-zen-gray-600">
        {focusSessions} sessions today
      </div>
    </div>
    
    <button
      on:click={toggleFocusSession}
      disabled={loading}
      class="w-full p-4 border-2 rounded-lg transition-colors
             disabled:opacity-50 disabled:cursor-not-allowed
             flex items-center justify-center gap-2
             {isSessionActive 
               ? 'border-red-400 bg-red-50 hover:bg-red-100' 
               : 'border-dashed border-zen-gray-300 hover:border-blue-400 hover:bg-blue-50'}"
    >
      {#if isSessionActive}
        <svg class="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10h6v4H9z" />
        </svg>
        <div class="text-center">
          <div class="text-sm font-medium text-red-600">Stop Session</div>
          <div class="text-lg font-mono text-red-700">{formatSessionTime(sessionDuration)}</div>
        </div>
      {:else}
        <svg class="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm font-medium text-blue-600">Start Focus Session</span>
      {/if}
    </button>
    
    {#if focusSessions > 0}
      <div class="flex gap-1 mt-3 justify-center">
        {#each Array(focusSessions) as _, i}
          <div class="w-3 h-3 bg-blue-500 rounded-full animate-pulse" 
               style="animation-delay: {i * 0.2}s"></div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Daily Summary Card -->
  {#if mood || energyLevel || learningMinutes > 0 || focusSessions > 0}
    <div class="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-100">
      <h5 class="text-sm font-semibold text-zen-gray-800 mb-2">Today's Snapshot</h5>
      <div class="grid grid-cols-2 gap-4 text-xs">
        <div class="text-center">
          <div class="text-lg mb-1">
            {mood ? moods.find(m => m.key === mood)?.emoji : '😶'}
          </div>
          <div class="text-zen-gray-600">
            {mood ? moods.find(m => m.key === mood)?.label : 'No mood set'}
          </div>
        </div>
        <div class="text-center">
          <div class="text-lg mb-1 font-bold text-orange-600">
            {energyLevel || '?'}/5
          </div>
          <div class="text-zen-gray-600">Energy</div>
        </div>
        <div class="text-center">
          <div class="text-lg mb-1 font-bold text-purple-600">
            {learningMinutes}m
          </div>
          <div class="text-zen-gray-600">Learning</div>
        </div>
        <div class="text-center">
          <div class="text-lg mb-1 font-bold text-blue-600">
            {focusSessions}
          </div>
          <div class="text-zen-gray-600">Sessions</div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Helpful Tips -->
  <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
    <div class="flex items-start gap-2">
      <div class="text-yellow-600">💡</div>
      <div>
        <h6 class="text-xs font-medium text-yellow-800 mb-1">Daily Tracking Tips</h6>
        <ul class="text-xs text-yellow-700 space-y-1">
          <li>• Track your mood to identify learning patterns</li>
          <li>• Log energy levels to optimize study times</li>
          <li>• Focus sessions help maintain concentration</li>
          <li>• Aim for at least 30 minutes of learning daily</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }
</style>