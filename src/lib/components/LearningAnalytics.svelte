<script>
  import { onMount } from 'svelte';
  
  export let weeklyStats = [];
  export let recentLogs = [];
  export let loading = false;
  
  let selectedTimeframe = 'week'; // week, month, quarter
  
  // Process weekly stats for charts (fix circular dependency)
  let processedStats = { labels: [], learningMinutes: [], goalCompletion: [], focusSessions: [], avgMood: [], avgEnergy: [] };
  let moodTrends = { amazing: 0, good: 0, okay: 0, struggling: 0, total: 0 };
  let learningPatterns = { bestDay: null, avgSessionsPerDay: 0, avgMinutesPerDay: 0, consistency: 0 };
  let productivityInsights = [];
  
  // Safe reactive updates
  $: if (weeklyStats && weeklyStats.length >= 0) {
    processedStats = processWeeklyData(weeklyStats);
  }
  
  $: if (recentLogs && recentLogs.length >= 0) {
    moodTrends = calculateMoodTrends(recentLogs);
    learningPatterns = calculateLearningPatterns(recentLogs);
  }
  
  $: if (processedStats && recentLogs) {
    productivityInsights = generateInsights(processedStats, recentLogs);
  }
  
  function processWeeklyData(stats) {
    if (!stats.length) return { labels: [], datasets: [] };
    
    const labels = stats.slice().reverse().map(stat => {
      const date = new Date(stat.week_of);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });
    
    return {
      labels,
      learningMinutes: stats.slice().reverse().map(s => s.total_minutes || 0),
      goalCompletion: stats.slice().reverse().map(s => {
        const rate = s.goals_set > 0 ? (s.goals_completed / s.goals_set) * 100 : 0;
        return Math.round(rate);
      }),
      focusSessions: stats.slice().reverse().map(s => s.total_sessions || 0),
      avgMood: stats.slice().reverse().map(s => s.avg_mood || 0),
      avgEnergy: stats.slice().reverse().map(s => s.avg_energy || 0)
    };
  }
  
  function calculateMoodTrends(logs) {
    const moodCounts = { amazing: 0, good: 0, okay: 0, struggling: 0 };
    const recentLogs = logs.slice(0, 30); // Last 30 days
    
    recentLogs.forEach(log => {
      if (log.mood) moodCounts[log.mood]++;
    });
    
    const total = Object.values(moodCounts).reduce((a, b) => a + b, 0);
    
    return {
      amazing: total > 0 ? Math.round((moodCounts.amazing / total) * 100) : 0,
      good: total > 0 ? Math.round((moodCounts.good / total) * 100) : 0,
      okay: total > 0 ? Math.round((moodCounts.okay / total) * 100) : 0,
      struggling: total > 0 ? Math.round((moodCounts.struggling / total) * 100) : 0,
      total
    };
  }
  
  function calculateLearningPatterns(logs) {
    const patterns = {
      bestDay: null,
      avgSessionsPerDay: 0,
      avgMinutesPerDay: 0,
      consistency: 0
    };
    
    if (!logs.length) return patterns;
    
    // Find best day of week
    const dayStats = {};
    logs.forEach(log => {
      const day = new Date(log.date).toLocaleDateString('en-US', { weekday: 'long' });
      if (!dayStats[day]) dayStats[day] = { minutes: 0, count: 0 };
      dayStats[day].minutes += log.learning_minutes || 0;
      dayStats[day].count++;
    });
    
    let bestDay = null;
    let bestAverage = 0;
    Object.entries(dayStats).forEach(([day, stats]) => {
      const avg = stats.minutes / stats.count;
      if (avg > bestAverage) {
        bestAverage = avg;
        bestDay = day;
      }
    });
    
    patterns.bestDay = bestDay;
    patterns.avgSessionsPerDay = logs.reduce((sum, log) => sum + (log.focus_sessions || 0), 0) / logs.length;
    patterns.avgMinutesPerDay = logs.reduce((sum, log) => sum + (log.learning_minutes || 0), 0) / logs.length;
    
    // Calculate consistency (percentage of days with some activity)
    const activeDays = logs.filter(log => (log.learning_minutes || 0) > 0 || (log.focus_sessions || 0) > 0).length;
    patterns.consistency = Math.round((activeDays / logs.length) * 100);
    
    return patterns;
  }
  
  function generateInsights(stats, logs) {
    const insights = [];
    
    if (stats.learningMinutes.length >= 2) {
      const recent = stats.learningMinutes.slice(-2);
      const change = recent[1] - recent[0];
      
      if (change > 0) {
        insights.push({
          type: 'positive',
          icon: '📈',
          title: 'Learning Time Increased',
          description: `You spent ${change} more minutes learning this week!`
        });
      } else if (change < 0) {
        insights.push({
          type: 'warning',
          icon: '📉',
          title: 'Learning Time Decreased',
          description: `Consider setting aside more time for learning this week.`
        });
      }
    }
    
    if (stats.goalCompletion.length >= 1) {
      const latestCompletion = stats.goalCompletion[stats.goalCompletion.length - 1];
      if (latestCompletion >= 80) {
        insights.push({
          type: 'positive',
          icon: '🎯',
          title: 'Excellent Goal Achievement',
          description: `${latestCompletion}% goal completion rate this week!`
        });
      }
    }
    
    const recentMoods = logs.slice(0, 7).filter(l => l.mood);
    const strugglingDays = recentMoods.filter(l => l.mood === 'struggling').length;
    
    if (strugglingDays >= 3) {
      insights.push({
        type: 'tip',
        icon: '💡',
        title: 'Consider Adjusting Your Approach',
        description: 'You\'ve had several challenging days. Maybe try shorter study sessions or different topics.'
      });
    }
    
    if (learningPatterns.consistency >= 80) {
      insights.push({
        type: 'positive',
        icon: '🔥',
        title: 'Amazing Consistency',
        description: `${learningPatterns.consistency}% consistency rate - you're building great habits!`
      });
    }
    
    return insights;
  }
  
  function getBarWidth(value, max) {
    return max > 0 ? (value / max) * 100 : 0;
  }
  
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
    <div class="flex gap-2">
      <button
        class="px-3 py-1 text-xs rounded-full {selectedTimeframe === 'week' ? 'bg-blue-100 text-blue-700' : 'bg-zen-gray-100 text-zen-gray-600'}"
        on:click={() => selectedTimeframe = 'week'}
      >
        Week
      </button>
      <button
        class="px-3 py-1 text-xs rounded-full {selectedTimeframe === 'month' ? 'bg-blue-100 text-blue-700' : 'bg-zen-gray-100 text-zen-gray-600'}"
        on:click={() => selectedTimeframe = 'month'}
      >
        Month
      </button>
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-32">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span class="ml-2 text-zen-gray-600">Loading analytics...</span>
    </div>
  {:else if processedStats.labels.length === 0}
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
          {formatDuration(Math.round(learningPatterns.avgMinutesPerDay))}
        </div>
        <div class="text-sm text-blue-600">Avg Daily Learning</div>
      </div>
      
      <div class="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg border border-green-200">
        <div class="text-2xl font-bold text-green-700">
          {Math.round(learningPatterns.avgSessionsPerDay)}
        </div>
        <div class="text-sm text-green-600">Avg Daily Sessions</div>
      </div>
      
      <div class="bg-gradient-to-r from-purple-50 to-purple-100 p-4 rounded-lg border border-purple-200">
        <div class="text-2xl font-bold text-purple-700">
          {learningPatterns.consistency}%
        </div>
        <div class="text-sm text-purple-600">Consistency Rate</div>
      </div>
      
      <div class="bg-gradient-to-r from-orange-50 to-orange-100 p-4 rounded-lg border border-orange-200">
        <div class="text-2xl font-bold text-orange-700">
          {learningPatterns.bestDay || 'N/A'}
        </div>
        <div class="text-sm text-orange-600">Most Productive Day</div>
      </div>
    </div>

    <!-- Learning Time Trend -->
    <div class="bg-white p-6 rounded-lg border border-zen-gray-200">
      <h4 class="text-md font-semibold text-zen-gray-800 mb-4">Learning Time Trend</h4>
      <div class="space-y-3">
        {#each processedStats.labels as label, i}
          <div class="flex items-center gap-3">
            <div class="w-16 text-xs text-zen-gray-600">{label}</div>
            <div class="flex-1 bg-zen-gray-100 rounded-full h-6 relative">
              <div 
                class="bg-gradient-to-r from-blue-400 to-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                style="width: {getBarWidth(processedStats.learningMinutes[i], Math.max(...processedStats.learningMinutes))}%"
              >
                <span class="text-xs text-white font-medium">
                  {formatDuration(processedStats.learningMinutes[i])}
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Goal Completion Rate -->
    <div class="bg-white p-6 rounded-lg border border-zen-gray-200">
      <h4 class="text-md font-semibold text-zen-gray-800 mb-4">Goal Completion Rate</h4>
      <div class="space-y-3">
        {#each processedStats.labels as label, i}
          <div class="flex items-center gap-3">
            <div class="w-16 text-xs text-zen-gray-600">{label}</div>
            <div class="flex-1 bg-zen-gray-100 rounded-full h-6 relative">
              <div 
                class="bg-gradient-to-r from-green-400 to-green-600 h-6 rounded-full flex items-center justify-end pr-2"
                style="width: {processedStats.goalCompletion[i]}%"
              >
                <span class="text-xs text-white font-medium">
                  {processedStats.goalCompletion[i]}%
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Mood Distribution -->
    {#if moodTrends.total > 0}
      <div class="bg-white p-6 rounded-lg border border-zen-gray-200">
        <h4 class="text-md font-semibold text-zen-gray-800 mb-4">Mood Distribution (Last 30 Days)</h4>
        <div class="space-y-3">
          <div class="flex items-center gap-3">
            <div class="w-16 text-xs">🤩 Amazing</div>
            <div class="flex-1 bg-zen-gray-100 rounded-full h-4">
              <div class="bg-green-500 h-4 rounded-full" style="width: {moodTrends.amazing}%"></div>
            </div>
            <div class="w-12 text-xs text-zen-gray-600 text-right">{moodTrends.amazing}%</div>
          </div>
          
          <div class="flex items-center gap-3">
            <div class="w-16 text-xs">😊 Good</div>
            <div class="flex-1 bg-zen-gray-100 rounded-full h-4">
              <div class="bg-blue-500 h-4 rounded-full" style="width: {moodTrends.good}%"></div>
            </div>
            <div class="w-12 text-xs text-zen-gray-600 text-right">{moodTrends.good}%</div>
          </div>
          
          <div class="flex items-center gap-3">
            <div class="w-16 text-xs">😐 Okay</div>
            <div class="flex-1 bg-zen-gray-100 rounded-full h-4">
              <div class="bg-yellow-500 h-4 rounded-full" style="width: {moodTrends.okay}%"></div>
            </div>
            <div class="w-12 text-xs text-zen-gray-600 text-right">{moodTrends.okay}%</div>
          </div>
          
          <div class="flex items-center gap-3">
            <div class="w-16 text-xs">😔 Struggling</div>
            <div class="flex-1 bg-zen-gray-100 rounded-full h-4">
              <div class="bg-orange-500 h-4 rounded-full" style="width: {moodTrends.struggling}%"></div>
            </div>
            <div class="w-12 text-xs text-zen-gray-600 text-right">{moodTrends.struggling}%</div>
          </div>
        </div>
      </div>
    {/if}

    <!-- Insights -->
    {#if productivityInsights.length > 0}
      <div class="bg-white p-6 rounded-lg border border-zen-gray-200">
        <h4 class="text-md font-semibold text-zen-gray-800 mb-4">Insights & Recommendations</h4>
        <div class="space-y-3">
          {#each productivityInsights as insight}
            <div class="flex items-start gap-3 p-3 rounded-lg
                       {insight.type === 'positive' ? 'bg-green-50 border border-green-200' :
                        insight.type === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                        'bg-blue-50 border border-blue-200'}">
              <div class="text-lg">{insight.icon}</div>
              <div class="flex-1">
                <div class="font-medium text-sm
                           {insight.type === 'positive' ? 'text-green-800' :
                            insight.type === 'warning' ? 'text-yellow-800' :
                            'text-blue-800'}">
                  {insight.title}
                </div>
                <div class="text-xs mt-1
                           {insight.type === 'positive' ? 'text-green-700' :
                            insight.type === 'warning' ? 'text-yellow-700' :
                            'text-blue-700'}">
                  {insight.description}
                </div>
              </div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Weekly Summary -->
    {#if weeklyStats.length > 0}
      <div class="bg-gradient-to-r from-purple-50 to-blue-50 p-6 rounded-lg border border-purple-200">
        <h4 class="text-md font-semibold text-purple-800 mb-4">This Week's Summary</h4>
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div class="text-2xl font-bold text-purple-700">{weeklyStats[0]?.total_minutes || 0}m</div>
            <div class="text-purple-600">Total Learning Time</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-purple-700">{weeklyStats[0]?.total_sessions || 0}</div>
            <div class="text-purple-600">Focus Sessions</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-purple-700">{weeklyStats[0]?.goals_completed || 0}</div>
            <div class="text-purple-600">Goals Completed</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-purple-700">
              {weeklyStats[0]?.avg_mood ? Math.round(weeklyStats[0].avg_mood * 10) / 10 : 'N/A'}
            </div>
            <div class="text-purple-600">Avg Mood</div>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>