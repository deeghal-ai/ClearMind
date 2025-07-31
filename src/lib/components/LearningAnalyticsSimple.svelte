<script>
  export let recentLogs = [];
  export let loading = false;
  
  // Simple computed values without complex reactive dependencies
  $: totalMinutes = recentLogs.reduce((sum, log) => sum + (log.learning_minutes || 0), 0);
  $: totalSessions = recentLogs.reduce((sum, log) => sum + (log.focus_sessions || 0), 0);
  $: totalDays = recentLogs.length;
  $: avgMinutesPerDay = totalDays > 0 ? Math.round(totalMinutes / totalDays) : 0;
  $: avgSessionsPerDay = totalDays > 0 ? Math.round((totalSessions / totalDays) * 10) / 10 : 0;
  
  // Simple mood calculation
  $: moodStats = (() => {
    const moods = { amazing: 0, good: 0, okay: 0, struggling: 0 };
    let total = 0;
    
    recentLogs.forEach(log => {
      if (log.mood) {
        moods[log.mood]++;
        total++;
      }
    });
    
    return {
      amazing: total > 0 ? Math.round((moods.amazing / total) * 100) : 0,
      good: total > 0 ? Math.round((moods.good / total) * 100) : 0,
      okay: total > 0 ? Math.round((moods.okay / total) * 100) : 0,
      struggling: total > 0 ? Math.round((moods.struggling / total) * 100) : 0,
      total
    };
  })();
  
  // Active days calculation
  $: activeDays = recentLogs.filter(log => 
    (log.learning_minutes || 0) > 0 || (log.focus_sessions || 0) > 0
  ).length;
  
  $: consistency = totalDays > 0 ? Math.round((activeDays / totalDays) * 100) : 0;
  
  function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }
</script>

<div class="learning-analytics space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <h3 class="text-lg font-semibold text-zen-gray-800">Learning Analytics</h3>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-32">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span class="ml-2 text-zen-gray-600">Loading analytics...</span>
    </div>
  {:else if recentLogs.length === 0}
    <div class="text-center py-8 text-zen-gray-500">
      <div class="text-4xl mb-2">📊</div>
      <p>No analytics data available yet</p>
      <p class="text-sm mt-1">Keep logging your learning activities to see insights!</p>
    </div>
  {:else}
    <!-- Key Metrics Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg border border-blue-200">
        <div class="text-2xl font-bold text-blue-700">
          {formatDuration(avgMinutesPerDay)}
        </div>
        <div class="text-sm text-blue-600">Avg Daily Learning</div>
      </div>
      
      <div class="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
        <div class="text-2xl font-bold text-green-700">
          {avgSessionsPerDay}
        </div>
        <div class="text-sm text-green-600">Avg Daily Sessions</div>
      </div>
      
      <div class="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
        <div class="text-2xl font-bold text-purple-700">
          {consistency}%
        </div>
        <div class="text-sm text-purple-600">Consistency Rate</div>
      </div>
      
      <div class="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
        <div class="text-2xl font-bold text-orange-700">
          {activeDays}/{totalDays}
        </div>
        <div class="text-sm text-orange-600">Active Days</div>
      </div>
    </div>

    <!-- Recent Learning Activity -->
    <div class="bg-white p-6 rounded-lg border border-zen-gray-200">
      <h4 class="text-md font-semibold text-zen-gray-800 mb-4">Recent Learning Activity</h4>
      <div class="space-y-2">
        {#each recentLogs.slice(0, 7) as log}
          <div class="flex items-center justify-between p-2 bg-zen-gray-50 rounded">
            <div class="text-sm">
              {new Date(log.date).toLocaleDateString('en-US', { 
                weekday: 'short', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
            <div class="flex items-center gap-4 text-sm">
              <span class="text-blue-600">{log.learning_minutes || 0}m</span>
              <span class="text-green-600">{log.focus_sessions || 0} sessions</span>
              <span class="text-purple-600">{log.completed_goals?.length || 0}/{log.goals?.length || 0} goals</span>
              {#if log.mood}
                <span class="text-lg">
                  {log.mood === 'amazing' ? '🤩' : 
                   log.mood === 'good' ? '😊' : 
                   log.mood === 'okay' ? '😐' : '😔'}
                </span>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Mood Distribution -->
    {#if moodStats.total > 0}
      <div class="bg-white p-6 rounded-lg border border-zen-gray-200">
        <h4 class="text-md font-semibold text-zen-gray-800 mb-4">Mood Distribution</h4>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-16 text-sm">🤩 Amazing</div>
            <div class="flex-1 bg-zen-gray-200 rounded-full h-4">
              <div class="bg-green-500 h-4 rounded-full" style="width: {moodStats.amazing}%"></div>
            </div>
            <div class="w-12 text-sm text-zen-gray-600">{moodStats.amazing}%</div>
          </div>
          
          <div class="flex items-center gap-3">
            <div class="w-16 text-sm">😊 Good</div>
            <div class="flex-1 bg-zen-gray-200 rounded-full h-4">
              <div class="bg-blue-500 h-4 rounded-full" style="width: {moodStats.good}%"></div>
            </div>
            <div class="w-12 text-sm text-zen-gray-600">{moodStats.good}%</div>
          </div>
          
          <div class="flex items-center gap-3">
            <div class="w-16 text-sm">😐 Okay</div>
            <div class="flex-1 bg-zen-gray-200 rounded-full h-4">
              <div class="bg-yellow-500 h-4 rounded-full" style="width: {moodStats.okay}%"></div>
            </div>
            <div class="w-12 text-sm text-zen-gray-600">{moodStats.okay}%</div>
          </div>
          
          <div class="flex items-center gap-3">
            <div class="w-16 text-sm">😔 Struggling</div>
            <div class="flex-1 bg-zen-gray-200 rounded-full h-4">
              <div class="bg-orange-500 h-4 rounded-full" style="width: {moodStats.struggling}%"></div>
            </div>
            <div class="w-12 text-sm text-zen-gray-600">{moodStats.struggling}%</div>
          </div>
        </div>
        
        <div class="mt-4 text-sm text-zen-gray-600">
          Based on {moodStats.total} days with mood data
        </div>
      </div>
    {/if}

    <!-- Learning Summary -->
    <div class="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
      <h4 class="text-md font-semibold text-purple-800 mb-4">Learning Summary</h4>
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div class="text-2xl font-bold text-purple-700">{formatDuration(totalMinutes)}</div>
          <div class="text-purple-600">Total Learning Time</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-purple-700">{totalSessions}</div>
          <div class="text-purple-600">Total Sessions</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-purple-700">{activeDays}</div>
          <div class="text-purple-600">Active Days</div>
        </div>
        <div>
          <div class="text-2xl font-bold text-purple-700">{totalDays}</div>
          <div class="text-purple-600">Days Tracked</div>
        </div>
      </div>
      
      {#if consistency >= 80}
        <div class="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
          <div class="flex items-center gap-2">
            <div class="text-green-600">🎉</div>
            <div class="text-sm text-green-800">
              <strong>Excellent consistency!</strong> You're learning {consistency}% of days. Keep it up!
            </div>
          </div>
        </div>
      {:else if consistency >= 50}
        <div class="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
          <div class="flex items-center gap-2">
            <div class="text-blue-600">💪</div>
            <div class="text-sm text-blue-800">
              <strong>Good progress!</strong> You're learning {consistency}% of days. Try for daily consistency!
            </div>
          </div>
        </div>
      {:else if activeDays > 0}
        <div class="mt-4 p-3 bg-yellow-100 rounded-lg border border-yellow-200">
          <div class="flex items-center gap-2">
            <div class="text-yellow-600">🚀</div>
            <div class="text-sm text-yellow-800">
              <strong>Great start!</strong> You're building a learning habit. Aim for more consistency!
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>