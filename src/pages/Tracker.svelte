<script>
  import { onMount } from 'svelte';
  import { trackerStore, todaysProgress, streakInfo } from '../lib/stores/tracker.js';
  import { user } from '../lib/stores/user.js';
  import GoalInput from '../lib/components/GoalInput.svelte';
  import MoodEnergyTracker from '../lib/components/MoodEnergyTracker.svelte';
  import CalendarHeatmap from '../lib/components/CalendarHeatmap.svelte';
  import LearningAnalytics from '../lib/components/LearningAnalyticsSimple.svelte';
  
  let userId = '';
  let activeTab = 'today';
  let calendarData = [];
  let showAchievements = false;
  
  onMount(async () => {
    // Initialize user
    user.init();
    const unsubscribe = user.subscribe(u => {
      userId = u.id;
      if (u.id) {
        initializeTracker(u.id);
      }
    });
    
    return unsubscribe;
  });
  
  async function initializeTracker(userId) {
    await trackerStore.init(userId);
    await loadCalendarData();
  }
  
  async function loadCalendarData() {
    if (!userId) return;
    calendarData = await trackerStore.getCalendarData(userId);
  }
  
  // Goal management handlers
  async function handleAddGoal(event) {
    await trackerStore.addGoal(userId, event.detail.goal);
  }
  
  async function handleRemoveGoal(event) {
    await trackerStore.removeGoal(userId, event.detail.index);
  }
  
  async function handleToggleGoal(event) {
    await trackerStore.toggleGoal(userId, event.detail.goal);
  }
  
  // Mood and energy handlers
  async function handleUpdateMood(event) {
    await trackerStore.updateMoodEnergy(userId, event.detail.mood, event.detail.energyLevel);
  }
  
  async function handleAddFocusSession() {
    await trackerStore.startFocusSession(userId);
  }
  
  async function handleAddLearningTime(event) {
    await trackerStore.addLearningTime(userId, event.detail.minutes);
  }
  
  // Reflection handlers
  let keyLearning = '';
  let reflection = '';
  let saveTimeout;
  
  function handleReflectionChange() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      trackerStore.updateReflection(userId, keyLearning, reflection);
    }, 1000);
  }
  
  // Achievement handlers
  function handleShowAchievements() {
    showAchievements = true;
  }
  
  function handleCloseAchievements() {
    showAchievements = false;
    trackerStore.clearNewAchievements();
  }
  
  // Reactive updates
  $: if ($trackerStore.todaysLog) {
    keyLearning = $trackerStore.keyLearning;
    reflection = $trackerStore.reflection;
  }
  
  // Achievement notification
  $: if ($trackerStore.newAchievements.length > 0) {
    showAchievements = true;
  }
</script>

<div class="max-w-6xl mx-auto p-4 space-y-6">
  <!-- Header with streak info -->
  <div class="bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg p-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold mb-2">Daily Learning Tracker</h1>
        <p class="opacity-90">Track your learning journey and build consistent habits</p>
      </div>
      <div class="text-right">
        <div class="text-3xl font-bold">{$streakInfo.current}</div>
        <div class="text-sm opacity-90">day streak</div>
        <div class="text-xs opacity-75">Longest: {$streakInfo.longest} days</div>
      </div>
    </div>
    
    {#if $todaysProgress.isComplete}
      <div class="mt-4 p-3 bg-white bg-opacity-20 rounded-lg text-center">
        <div class="text-lg">🎉 Great work today!</div>
        <div class="text-sm opacity-90">You've completed your goals and logged learning time</div>
      </div>
    {/if}
  </div>

  <!-- Error Display -->
  {#if $trackerStore.error}
    <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
      {$trackerStore.error}
      <button
        on:click={() => trackerStore.clearError()}
        class="float-right font-bold"
      >
        ×
      </button>
    </div>
  {/if}

  <!-- Tab Navigation -->
  <div class="border-b border-zen-gray-200">
    <nav class="flex space-x-8">
      <button
        class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'today' 
          ? 'border-blue-500 text-blue-600' 
          : 'border-transparent text-zen-gray-500 hover:text-zen-gray-700'}"
        on:click={() => activeTab = 'today'}
      >
        Today
      </button>
      <button
        class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'history' 
          ? 'border-blue-500 text-blue-600' 
          : 'border-transparent text-zen-gray-500 hover:text-zen-gray-700'}"
        on:click={() => activeTab = 'history'}
      >
        History
      </button>
      <button
        class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'analytics' 
          ? 'border-blue-500 text-blue-600' 
          : 'border-transparent text-zen-gray-500 hover:text-zen-gray-700'}"
        on:click={() => activeTab = 'analytics'}
      >
        Analytics
      </button>
      <button
        class="py-2 px-1 border-b-2 font-medium text-sm {activeTab === 'achievements' 
          ? 'border-blue-500 text-blue-600' 
          : 'border-transparent text-zen-gray-500 hover:text-zen-gray-700'}"
        on:click={() => activeTab = 'achievements'}
      >
        Achievements
        {#if $trackerStore.achievements.length > 0}
          <span class="ml-1 bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
            {$trackerStore.achievements.length}
          </span>
        {/if}
      </button>
    </nav>
  </div>

  <!-- Tab Content -->
  {#if activeTab === 'today'}
    <!-- Today's Overview Cards -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
      <!-- Goals Card -->
      <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-100">
        <div class="flex items-center justify-between mb-2">
          <div class="text-green-700 font-medium text-sm">Goals Progress</div>
          <div class="text-2xl">🎯</div>
        </div>
        <div class="text-2xl font-bold text-green-800 mb-1">
          {$todaysProgress.completedGoals}/{$todaysProgress.totalGoals}
        </div>
        <div class="w-full bg-green-200 rounded-full h-1.5">
          <div 
            class="bg-green-500 h-1.5 rounded-full transition-all duration-300"
            style="width: {$todaysProgress.completionRate}%"
          ></div>
        </div>
      </div>

      <!-- Learning Time Card -->
      <div class="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
        <div class="flex items-center justify-between mb-2">
          <div class="text-blue-700 font-medium text-sm">Learning Time</div>
          <div class="text-2xl">⏱️</div>
        </div>
        <div class="text-2xl font-bold text-blue-800 mb-1">
          {$trackerStore.learningMinutes}m
        </div>
        <div class="w-full bg-blue-200 rounded-full h-1.5">
          <div 
            class="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
            style="width: {Math.min(100, ($trackerStore.learningMinutes / 120) * 100)}%"
          ></div>
        </div>
        <div class="text-xs text-blue-600 mt-1">Goal: 2 hours</div>
      </div>

      <!-- Focus Sessions Card -->
      <div class="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-100">
        <div class="flex items-center justify-between mb-2">
          <div class="text-purple-700 font-medium text-sm">Focus Sessions</div>
          <div class="text-2xl">🔥</div>
        </div>
        <div class="text-2xl font-bold text-purple-800 mb-1">
          {$trackerStore.focusSessions}
        </div>
        <div class="flex gap-1 mt-2">
          {#each Array(Math.max(5, $trackerStore.focusSessions)) as _, i}
            <div class="w-2 h-2 rounded-full {i < $trackerStore.focusSessions ? 'bg-purple-500' : 'bg-purple-200'}"></div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Main Content Grid -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column - Goals & Progress -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Goals Section -->
        <div class="bg-white rounded-xl border border-zen-gray-200 p-6 shadow-sm">
          <GoalInput
            goals={$trackerStore.todaysGoals}
            completedGoals={$trackerStore.completedGoals}
            loading={$trackerStore.loading}
            on:addGoal={handleAddGoal}
            on:removeGoal={handleRemoveGoal}
            on:toggleGoal={handleToggleGoal}
          />
        </div>

        <!-- Roadmap Progress -->
        {#if $trackerStore.todaysLog?.roadmap_progress && Object.keys($trackerStore.todaysLog.roadmap_progress).length > 0}
          <div class="bg-white rounded-xl border border-zen-gray-200 p-6 shadow-sm">
            <h3 class="text-lg font-semibold text-zen-gray-800 mb-4 flex items-center gap-2">
              <span class="text-xl">🗺️</span>
              Today's Roadmap Progress
            </h3>
            
            <div class="space-y-4">
              {#each Object.entries($trackerStore.todaysLog.roadmap_progress) as [roadmapName, progress]}
                <div class="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <div class="font-medium text-blue-900 mb-3 flex items-center gap-2">
                    <span class="text-lg">📚</span>
                    {roadmapName}
                  </div>
                  <div class="grid grid-cols-2 gap-4 text-sm">
                    <div class="text-center p-2 bg-white rounded-lg">
                      <div class="text-lg font-bold text-blue-600">{progress.stages_worked_on?.length || 0}</div>
                      <div class="text-blue-700 text-xs">Stages Worked</div>
                    </div>
                    <div class="text-center p-2 bg-white rounded-lg">
                      <div class="text-lg font-bold text-green-600">{progress.stages_completed?.length || 0}</div>
                      <div class="text-green-700 text-xs">Completed</div>
                    </div>
                  </div>
                  {#if progress.stages_completed?.length > 0}
                    <div class="mt-3">
                      <div class="text-xs text-green-600 mb-2 font-medium">Completed today:</div>
                      <div class="flex flex-wrap gap-1">
                        {#each progress.stages_completed as stage}
                          <span class="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full border border-green-200">
                            ✅ {stage}
                          </span>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </div>
        {/if}
        
        <!-- Reflection Section -->
        <div class="bg-white rounded-xl border border-zen-gray-200 p-6 shadow-sm">
          <h3 class="text-lg font-semibold text-zen-gray-800 mb-4 flex items-center gap-2">
            <span class="text-xl">💭</span>
            Daily Reflection
          </h3>
          
          <div class="space-y-4">
            <div>
              <label for="key-learning" class="block text-sm font-medium text-zen-gray-700 mb-2">
                Key Learning Today
              </label>
              <input
                id="key-learning"
                bind:value={keyLearning}
                on:input={handleReflectionChange}
                placeholder="What's the most important thing you learned today?"
                class="w-full px-4 py-3 border border-zen-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            
            <div>
              <label for="reflection" class="block text-sm font-medium text-zen-gray-700 mb-2">
                Reflection
              </label>
              <textarea
                id="reflection"
                bind:value={reflection}
                on:input={handleReflectionChange}
                rows="4"
                placeholder="How did your learning go today? Any challenges or breakthroughs?"
                class="w-full px-4 py-3 border border-zen-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
              ></textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- Right Column - Mood & Energy -->
      <div class="space-y-6">
        <!-- Mood & Energy Tracker -->
        <div class="bg-white rounded-xl border border-zen-gray-200 p-6 shadow-sm">
          <h3 class="text-lg font-semibold text-zen-gray-800 mb-4 flex items-center gap-2">
            <span class="text-xl">😊</span>
            How are you doing?
          </h3>
          <MoodEnergyTracker
            mood={$trackerStore.mood}
            energyLevel={$trackerStore.energyLevel}
            learningMinutes={$trackerStore.learningMinutes}
            focusSessions={$trackerStore.focusSessions}
            loading={$trackerStore.loading}
            on:updateMood={handleUpdateMood}
            on:addFocusSession={handleAddFocusSession}
            on:addLearningTime={handleAddLearningTime}
          />
        </div>
      </div>
    </div>

  {:else if activeTab === 'history'}
    <div class="space-y-6">
      <CalendarHeatmap 
        {calendarData}
        loading={$trackerStore.loading}
      />
      
      <!-- Recent Activity -->
      <div class="bg-white rounded-lg border border-zen-gray-200 p-6">
        <h3 class="text-lg font-semibold text-zen-gray-800 mb-4">Recent Activity</h3>
        
        {#if $trackerStore.recentLogs.length === 0}
          <div class="text-center py-8 text-zen-gray-500">
            <div class="text-4xl mb-2">📝</div>
            <p>No recent activity</p>
            <p class="text-sm mt-1">Start logging your learning to see your history!</p>
          </div>
        {:else}
          <div class="space-y-3">
            {#each $trackerStore.recentLogs.slice(0, 10) as log}
              <div class="flex items-center justify-between p-3 bg-zen-gray-50 rounded-lg">
                <div>
                  <div class="font-medium text-sm">
                    {new Date(log.date).toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      month: 'short', 
                      day: 'numeric' 
                    })}
                  </div>
                  <div class="text-xs text-zen-gray-600">
                    {log.completed_goals?.length || 0}/{log.goals?.length || 0} goals •
                    {log.learning_minutes || 0}m learning •
                    {log.focus_sessions || 0} sessions
                  </div>
                </div>
                
                <div class="flex items-center gap-2">
                  {#if log.mood}
                    <div class="text-lg">
                      {log.mood === 'amazing' ? '🤩' : 
                       log.mood === 'good' ? '😊' : 
                       log.mood === 'okay' ? '😐' : '😔'}
                    </div>
                  {/if}
                  {#if log.energy_level}
                    <div class="text-xs text-zen-gray-500">
                      Energy: {log.energy_level}/5
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>

  {:else if activeTab === 'analytics'}
    <LearningAnalytics 
      recentLogs={$trackerStore.recentLogs}
      loading={$trackerStore.loading}
    />

  {:else if activeTab === 'achievements'}
    <div class="space-y-6">
      {#if $trackerStore.achievements.length === 0}
        <div class="text-center py-12 text-zen-gray-500">
          <div class="text-6xl mb-4">🏆</div>
          <h3 class="text-xl font-semibold mb-2">No achievements yet</h3>
          <p>Keep learning and tracking your progress to unlock achievements!</p>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {#each $trackerStore.achievements as achievement}
            <div class="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
              <div class="text-2xl mb-2">🏆</div>
              <h4 class="font-semibold text-yellow-800">{achievement.title}</h4>
              <p class="text-sm text-yellow-700 mt-1">{achievement.description}</p>
              <div class="text-xs text-yellow-600 mt-2">
                Unlocked {new Date(achievement.unlocked_at).toLocaleDateString()}
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>

<!-- Achievement Notification Modal -->
{#if showAchievements && $trackerStore.newAchievements.length > 0}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg p-6 max-w-md w-full mx-4">
      <div class="text-center">
        <div class="text-4xl mb-4">🎉</div>
        <h3 class="text-xl font-semibold text-zen-gray-800 mb-4">New Achievement Unlocked!</h3>
        
        {#each $trackerStore.newAchievements as achievement}
          <div class="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <div class="text-2xl mb-2">{achievement.icon || '🏆'}</div>
            <h4 class="font-semibold text-yellow-800">{achievement.title}</h4>
          </div>
        {/each}
        
        <button
          on:click={handleCloseAchievements}
          class="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
        >
          Awesome!
        </button>
      </div>
    </div>
  </div>
{/if}