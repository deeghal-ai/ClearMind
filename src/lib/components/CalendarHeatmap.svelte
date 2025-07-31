<script>
  import { onMount } from 'svelte';
  
  export let calendarData = [];
  export let loading = false;
  
  let heatmapContainer;
  let selectedDate = null;
  let hoveredCell = null;
  
  // Generate year view (52 weeks * 7 days)
  function generateCalendarGrid() {
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    
    const weeks = [];
    const startDate = new Date(oneYearAgo);
    
    // Start from Sunday of the week containing one year ago
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    for (let week = 0; week < 53; week++) {
      const weekDays = [];
      for (let day = 0; day < 7; day++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + (week * 7) + day);
        
        if (currentDate <= today) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const dataPoint = calendarData.find(d => d.date === dateStr);
          
          weekDays.push({
            date: currentDate,
            dateStr,
            value: dataPoint?.value || 0,
            data: dataPoint || { goals: 0, completed: 0, sessions: 0 }
          });
        } else {
          weekDays.push(null); // Future dates
        }
      }
      weeks.push(weekDays);
    }
    
    return weeks;
  }
  
  function getIntensityClass(value) {
    if (value === 0) return 'intensity-0';
    if (value === 1) return 'intensity-1';
    if (value === 2) return 'intensity-2';
    if (value === 3) return 'intensity-3';
    return 'intensity-4';
  }
  
  function formatDate(date) {
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
  
  function getTooltipText(cell) {
    if (!cell) return '';
    
    const { date, data } = cell;
    const formattedDate = formatDate(date);
    
    if (data.goals === 0 && data.completed === 0 && data.sessions === 0) {
      return `${formattedDate}\nNo activity recorded`;
    }
    
    return `${formattedDate}\n${data.completed}/${data.goals} goals completed\n${data.sessions} focus sessions`;
  }
  
  function handleCellClick(cell) {
    if (!cell) return;
    selectedDate = selectedDate?.dateStr === cell.dateStr ? null : cell;
  }
  
  function handleCellHover(cell) {
    hoveredCell = cell;
  }
  
  function handleCellLeave() {
    hoveredCell = null;
  }
  
  $: calendarGrid = generateCalendarGrid();
  $: totalDays = calendarData.length;
  $: activeDays = calendarData.filter(d => d.value > 0).length;
  $: currentStreak = calculateCurrentStreak();
  $: longestStreak = calculateLongestStreak();
  
  function calculateCurrentStreak() {
    if (!calendarData.length) return 0;
    
    const today = new Date().toISOString().split('T')[0];
    const sortedData = [...calendarData].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let streak = 0;
    let currentDate = new Date();
    
    for (const entry of sortedData) {
      const entryDate = new Date(entry.date);
      const daysDiff = Math.floor((currentDate - entryDate) / (1000 * 60 * 60 * 24));
      
      if (daysDiff === streak && entry.value > 0) {
        streak++;
        currentDate = entryDate;
      } else {
        break;
      }
    }
    
    return streak;
  }
  
  function calculateLongestStreak() {
    if (!calendarData.length) return 0;
    
    const sortedData = [...calendarData].sort((a, b) => new Date(a.date) - new Date(b.date));
    let maxStreak = 0;
    let currentStreak = 0;
    let lastDate = null;
    
    for (const entry of sortedData) {
      if (entry.value > 0) {
        const entryDate = new Date(entry.date);
        
        if (lastDate) {
          const daysDiff = Math.floor((entryDate - lastDate) / (1000 * 60 * 60 * 24));
          if (daysDiff === 1) {
            currentStreak++;
          } else {
            currentStreak = 1;
          }
        } else {
          currentStreak = 1;
        }
        
        maxStreak = Math.max(maxStreak, currentStreak);
        lastDate = entryDate;
      } else {
        currentStreak = 0;
      }
    }
    
    return maxStreak;
  }
  
  onMount(() => {
    // Optional: Add keyboard navigation
    function handleKeydown(e) {
      if (e.key === 'Escape') {
        selectedDate = null;
      }
    }
    
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="calendar-heatmap">
  <!-- Header with stats -->
  <div class="mb-6">
    <h3 class="text-lg font-semibold text-gray-800 mb-2">Learning Activity</h3>
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
      <div class="text-center">
        <div class="text-xl font-bold text-green-600">{activeDays}</div>
        <div class="text-gray-600">Active Days</div>
      </div>
      <div class="text-center">
        <div class="text-xl font-bold text-blue-600">{currentStreak}</div>
        <div class="text-gray-600">Current Streak</div>
      </div>
      <div class="text-center">
        <div class="text-xl font-bold text-purple-600">{longestStreak}</div>
        <div class="text-gray-600">Longest Streak</div>
      </div>
      <div class="text-center">
        <div class="text-xl font-bold text-gray-700">{totalDays}</div>
        <div class="text-gray-600">Total Days</div>
      </div>
    </div>
  </div>

  {#if loading}
    <div class="flex items-center justify-center h-32">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      <span class="ml-2 text-gray-600">Loading calendar...</span>
    </div>
  {:else}
    <!-- Calendar Grid -->
    <div class="overflow-x-auto pb-4">
      <div bind:this={heatmapContainer} class="relative">
        <!-- Month labels -->
        <div class="flex mb-2 ml-8">
          {#each ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as month, i}
            <div class="text-xs text-gray-500 flex-1 text-center" style="min-width: 2.5rem;">
              {month}
            </div>
          {/each}
        </div>
        
        <!-- Calendar grid -->
        <div class="flex">
          <!-- Day labels -->
          <div class="flex flex-col mr-2">
            {#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as day, i}
              <div class="h-3 flex items-center text-xs text-gray-500 mb-1" style="height: 11px;">
                {i % 2 === 1 ? day : ''}
              </div>
            {/each}
          </div>
          
          <!-- Heatmap cells -->
          <div class="flex gap-1">
            {#each calendarGrid as week}
              <div class="flex flex-col gap-1">
                {#each week as cell}
                  {#if cell}
                    <button
                      class="heatmap-cell {getIntensityClass(cell.value)} 
                             {selectedDate?.dateStr === cell.dateStr ? 'selected' : ''}"
                      title={getTooltipText(cell)}
                      on:click={() => handleCellClick(cell)}
                      on:mouseenter={() => handleCellHover(cell)}
                      on:mouseleave={handleCellLeave}
                    ></button>
                  {:else}
                    <div class="heatmap-cell intensity-future"></div>
                  {/if}
                {/each}
              </div>
            {/each}
          </div>
        </div>
        
        <!-- Tooltip -->
        {#if hoveredCell}
          <div class="absolute z-10 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 pointer-events-none whitespace-pre-line"
               style="left: 50%; top: -80px; transform: translateX(-50%);">
            {getTooltipText(hoveredCell)}
            <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Legend -->
    <div class="flex items-center justify-between mt-4">
      <div class="text-xs text-gray-500">
        Less
      </div>
      <div class="flex gap-1">
        <div class="heatmap-cell intensity-0"></div>
        <div class="heatmap-cell intensity-1"></div>
        <div class="heatmap-cell intensity-2"></div>
        <div class="heatmap-cell intensity-3"></div>
        <div class="heatmap-cell intensity-4"></div>
      </div>
      <div class="text-xs text-gray-500">
        More
      </div>
    </div>

    <!-- Selected Date Details -->
    {#if selectedDate}
      <div class="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div class="flex items-center justify-between mb-2">
          <h4 class="font-medium text-blue-900">{formatDate(selectedDate.date)}</h4>
          <button
            on:click={() => selectedDate = null}
            class="text-blue-600 hover:text-blue-800"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {#if selectedDate.data.goals > 0 || selectedDate.data.sessions > 0}
          <div class="grid grid-cols-3 gap-4 text-sm">
            <div class="text-center">
              <div class="text-lg font-bold text-green-600">{selectedDate.data.completed}/{selectedDate.data.goals}</div>
              <div class="text-blue-700">Goals</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-bold text-purple-600">{selectedDate.data.sessions}</div>
              <div class="text-blue-700">Sessions</div>
            </div>
            <div class="text-center">
              <div class="text-lg font-bold text-orange-600">{selectedDate.value}/4</div>
              <div class="text-blue-700">Intensity</div>
            </div>
          </div>
        {:else}
          <p class="text-blue-700 text-sm">No learning activity recorded for this day.</p>
        {/if}
      </div>
    {/if}
  {/if}
</div>

<style>
  .heatmap-cell {
    width: 11px;
    height: 11px;
    border-radius: 2px;
    cursor: pointer;
    transition: all 0.1s ease;
    border: 1px solid transparent;
  }
  
  .intensity-0 {
    background-color: #ebedf0;
  }
  
  .intensity-1 {
    background-color: #9be9a8;
  }
  
  .intensity-2 {
    background-color: #40c463;
  }
  
  .intensity-3 {
    background-color: #30a14e;
  }
  
  .intensity-4 {
    background-color: #216e39;
  }
  
  .intensity-future {
    background-color: #f8f9fa;
    cursor: default;
  }
  
  .heatmap-cell:not(.intensity-future):hover {
    border-color: #333;
    transform: scale(1.1);
  }
  
  .heatmap-cell.selected {
    border-color: #2563eb;
    border-width: 2px;
    transform: scale(1.1);
  }
  
  .calendar-heatmap {
    user-select: none;
  }
</style>