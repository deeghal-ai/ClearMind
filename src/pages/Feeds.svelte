<script>
  import { onMount, onDestroy } from 'svelte';
  import { fetchAllFeedsEnhanced, groupFeedsByCategory } from '../lib/feedParserEnhanced.js';
  import { getCachedFeeds, setCachedFeeds, clearFeedCache, getCacheAge } from '../lib/feedCache.js';
  import { getFeedCategory, getCategoryColor } from '../lib/feedSources.js';
  import FeedSettings from '../lib/FeedSettings.svelte';
  
  export const userId = '';
  
  let feeds = [];
  let loading = true;
  let refreshing = false;
  let error = null;
  let lastUpdated = null;
  let cacheAge = null;
  let searchTerm = '';
  let selectedCategory = 'all';
  let collapsedSources = new Set();
  let showSettings = false;
  let autoRefreshInterval = null;
  
  // Categories for filtering
  const categories = [
    { id: 'all', name: 'All Sources', count: 0 },
    { id: 'news', name: 'News', count: 0 },
    { id: 'research', name: 'Research', count: 0 },
    { id: 'community', name: 'Community', count: 0 }
  ];
  
  onMount(async () => {
    await loadFeeds();
    setupAutoRefresh();
    setupKeyboardShortcuts();
  });
  
  onDestroy(() => {
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval);
    }
  });
  
  async function loadFeeds(forceRefresh = false) {
    loading = true;
    error = null;
    
    try {
      let feedData = null;
      
      // Try to load from cache first
      if (!forceRefresh) {
        feedData = getCachedFeeds();
        if (feedData) {
          cacheAge = getCacheAge();
        }
      }
      
      // If no cache or force refresh, fetch new data
      if (!feedData) {
        refreshing = true;
        console.log('Fetching fresh feeds with enhanced parser...');
        feedData = await fetchAllFeedsEnhanced();
        
        // Cache the results
        setCachedFeeds(feedData);
        cacheAge = 0;
      }
      
      // Filter out disabled feeds
      feeds = (feedData.feeds || []).filter(feed => {
        return localStorage.getItem(`feed_${feed.source}_disabled`) !== 'true';
      });
      
      lastUpdated = feedData.timestamp;
      updateCategoryCounts();
      
      // Show success message if force refresh
      if (forceRefresh && feedData.successCount > 0) {
        showToast(`Successfully refreshed ${feedData.successCount}/${feedData.totalCount} feeds`);
      }
      
    } catch (err) {
      console.error('Failed to load feeds:', err);
      error = err.message;
      
      // Try to load cached data as fallback
      const cachedData = getCachedFeeds();
      if (cachedData) {
        feeds = cachedData.feeds || [];
        lastUpdated = cachedData.timestamp;
        updateCategoryCounts();
        showToast('Loaded cached feeds (refresh failed)', 'warning');
      }
    } finally {
      loading = false;
      refreshing = false;
    }
  }
  
  function updateCategoryCounts() {
    // Reset counts
    categories.forEach(cat => cat.count = 0);
    
    feeds.forEach(feed => {
      if (feed.success && feed.items.length > 0) {
        const category = getFeedCategory(feed.source);
        const catObj = categories.find(c => c.id === category);
        if (catObj) catObj.count += feed.items.length;
        
        // Update 'all' count
        categories[0].count += feed.items.length;
      }
    });
  }
  
  async function refreshFeeds() {
    await loadFeeds(true);
  }
  
  function clearCache() {
    clearFeedCache();
    showToast('Cache cleared');
  }
  
  function toggleSource(sourceName) {
    if (collapsedSources.has(sourceName)) {
      collapsedSources.delete(sourceName);
    } else {
      collapsedSources.add(sourceName);
    }
    collapsedSources = new Set(collapsedSources); // Trigger reactivity
  }
  
  function setupAutoRefresh() {
    // Auto-refresh every 30 minutes
    autoRefreshInterval = setInterval(async () => {
      if (!refreshing && !loading) {
        console.log('Auto-refreshing feeds...');
        await loadFeeds(true);
      }
    }, 30 * 60 * 1000);
  }
  
  function setupKeyboardShortcuts() {
    function handleKeypress(e) {
      // Ctrl/Cmd + R to refresh
      if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
        e.preventDefault();
        refreshFeeds();
      }
      
      // Ctrl/Cmd + S to open settings  
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        showSettings = true;
      }
      
      // Escape to close settings
      if (e.key === 'Escape' && showSettings) {
        showSettings = false;
      }
    }
    
    document.addEventListener('keydown', handleKeypress);
    
    // Cleanup on destroy
    return () => {
      document.removeEventListener('keydown', handleKeypress);
    };
  }
  
  // Enhanced filtering with search
  $: filteredFeeds = feeds.filter(feed => {
    if (!feed.success || feed.items.length === 0) return false;
    
    // Category filter
    if (selectedCategory !== 'all') {
      const feedCategory = getFeedCategory(feed.source);
      if (feedCategory !== selectedCategory) return false;
    }
    
    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      const sourceMatch = feed.source.toLowerCase().includes(searchLower);
      const itemsMatch = feed.items.some(item => 
        item.title.toLowerCase().includes(searchLower) ||
        (item.description && item.description.toLowerCase().includes(searchLower))
      );
      return sourceMatch || itemsMatch;
    }
    
    return true;
  });
  
  function formatTimeAgo(dateString) {
    if (!dateString) return 'Unknown time';
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  }
  
  function formatCacheAge(ageInSeconds) {
    if (ageInSeconds === null) return '';
    if (ageInSeconds < 60) return `${ageInSeconds}s ago`;
    
    const minutes = Math.floor(ageInSeconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  }
  
  // Enhanced toast notification
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
  
  // Get feed stats
  $: stats = {
    total: feeds.reduce((sum, feed) => sum + (feed.success ? feed.items.length : 0), 0),
    sources: feeds.filter(feed => feed.success).length,
    errors: feeds.filter(feed => !feed.success).length
  };
</script>

<div class="space-y-6">
  <!-- Enhanced Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold">AI/ML Feeds</h1>
      <div class="flex items-center gap-4 text-sm text-zen-gray-500 mt-1">
        {#if stats.total > 0}
          <span>{stats.total} articles from {stats.sources} sources</span>
        {/if}
        {#if stats.errors > 0}
          <span class="text-orange-600">{stats.errors} sources failed</span>
        {/if}
        {#if lastUpdated}
          <span>Updated {formatTimeAgo(lastUpdated)}</span>
        {/if}
        {#if cacheAge !== null}
          <span>Cached {formatCacheAge(cacheAge)}</span>
        {/if}
      </div>
    </div>
    
    <div class="flex items-center gap-2">
      <button
        on:click={() => showSettings = true}
        class="p-2 text-zen-gray-600 hover:bg-zen-gray-100 rounded-lg transition-colors"
        title="Feed settings (Ctrl+S)"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
      
      <button 
        class="btn-primary flex items-center gap-2 {refreshing ? 'opacity-50 cursor-not-allowed' : ''}" 
        on:click={refreshFeeds} 
        disabled={refreshing}
        title="Refresh feeds (Ctrl+R)"
      >
        <svg 
          class="w-4 h-4 {refreshing ? 'animate-spin' : ''}" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {refreshing ? 'Refreshing...' : 'Refresh'}
      </button>
      
      <button 
        class="px-3 py-2 text-sm text-zen-gray-600 hover:text-zen-gray-800 border border-zen-gray-300 rounded-lg hover:bg-zen-gray-50 transition-colors"
        on:click={clearCache}
        title="Clear cache"
      >
        Clear Cache
      </button>
    </div>
  </div>
  
  <!-- Enhanced Search and Filters -->
  <div class="card-zen">
    <div class="flex flex-col sm:flex-row gap-4">
      <!-- Search with icon -->
      <div class="flex-1 relative">
        <svg class="absolute left-3 top-2.5 w-5 h-5 text-zen-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          bind:value={searchTerm}
          placeholder="Search feeds, titles, or content..."
          class="w-full pl-10 pr-4 py-2 border border-zen-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <!-- Category Filter with counts -->
      <div class="sm:w-48">
        <select 
          bind:value={selectedCategory}
          class="w-full px-3 py-2 border border-zen-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {#each categories as category}
            <option value={category.id}>
              {category.name} ({category.count})
            </option>
          {/each}
        </select>
      </div>
    </div>
  </div>
  
  <!-- Loading State -->
  {#if loading}
    <div class="space-y-4">
      {#each Array(3) as _}
        <div class="card-zen">
          <div class="animate-pulse">
            <div class="flex items-center gap-3 mb-4">
              <div class="w-1 h-8 bg-zen-gray-200 rounded-full"></div>
              <div class="flex-1">
                <div class="h-5 w-32 bg-zen-gray-200 rounded"></div>
                <div class="h-3 w-24 bg-zen-gray-100 rounded mt-1"></div>
              </div>
            </div>
            <div class="space-y-3">
              {#each Array(3) as _}
                <div class="h-16 bg-zen-gray-100 rounded"></div>
              {/each}
            </div>
          </div>
        </div>
      {/each}
    </div>
  
  <!-- Error State -->
  {:else if error}
    <div class="card-zen bg-red-50 border-red-200">
      <div class="flex items-center gap-2 mb-2">
        <span class="text-red-500 text-lg">⚠️</span>
        <h3 class="font-medium text-red-800">Failed to Load Feeds</h3>
      </div>
      <p class="text-red-600 text-sm mb-4">{error}</p>
      <div class="flex gap-2">
        <button class="btn-primary" on:click={() => loadFeeds(true)}>
          Try Again
        </button>
        <button 
          class="px-4 py-2 text-red-700 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
          on:click={() => showSettings = true}
        >
          Check Settings
        </button>
      </div>
    </div>
  
  <!-- Feeds Content -->
  {:else if filteredFeeds.length === 0}
    <div class="card-zen text-center py-12">
      <div class="text-4xl mb-4">📡</div>
      <p class="text-zen-gray-500">
        {searchTerm || selectedCategory !== 'all' 
          ? 'No feeds match your search criteria.' 
          : 'No feeds available.'}
      </p>
      {#if searchTerm || selectedCategory !== 'all'}
        <button 
          class="mt-4 text-blue-600 hover:text-blue-800 underline"
          on:click={() => { searchTerm = ''; selectedCategory = 'all'; }}
        >
          Clear filters
        </button>
      {:else}
        <div class="flex justify-center gap-2 mt-4">
          <button class="btn-primary" on:click={refreshFeeds}>
            Refresh Feeds
          </button>
          <button 
            class="px-4 py-2 text-zen-gray-700 border border-zen-gray-300 rounded-lg hover:bg-zen-gray-50 transition-colors"
            on:click={() => showSettings = true}
          >
            Check Settings
          </button>
        </div>
      {/if}
    </div>
  
  {:else}
    <!-- Enhanced Feed Sources -->
    {#each filteredFeeds as feed}
      <div class="card-zen">
        <!-- Source Header with enhanced info -->
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-3">
            <button
              on:click={() => toggleSource(feed.source)}
              class="text-zen-gray-400 hover:text-zen-gray-600 transition-colors"
            >
              {collapsedSources.has(feed.source) ? '▶️' : '▼'}
            </button>
            
            <div>
              <h2 class="font-semibold text-zen-gray-800">{feed.source}</h2>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-xs px-2 py-1 rounded-full border {getCategoryColor(getFeedCategory(feed.source))}">
                  {getFeedCategory(feed.source)}
                </span>
                <span class="text-xs text-zen-gray-500">
                  {feed.items.length} items
                </span>
                {#if feed.fetchedAt}
                  <span class="text-xs text-zen-gray-400">
                    • {formatTimeAgo(feed.fetchedAt)}
                  </span>
                {/if}
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            {#if feed.error}
              <span class="text-red-500 text-sm" title={feed.error}>⚠️</span>
            {:else}
              <span class="text-green-500 text-sm">✅</span>
            {/if}
          </div>
        </div>
        
        <!-- Feed Items -->
        {#if !collapsedSources.has(feed.source)}
          <div class="space-y-3">
            {#each feed.items as item}
              <a 
                href={item.link}
                target="_blank"
                rel="noopener noreferrer"
                class="block p-3 -mx-3 rounded-lg hover:bg-zen-gray-50 transition-colors group border-l-2 border-transparent hover:border-blue-300"
              >
                <h3 class="font-medium text-blue-600 group-hover:underline mb-1">
                  {item.title}
                </h3>
                {#if item.description}
                  <p class="text-sm text-zen-gray-600 mb-2 line-clamp-2">
                    {item.description}
                  </p>
                {/if}
                <div class="flex items-center justify-between text-xs text-zen-gray-400">
                  <span>{formatTimeAgo(item.pubDate)}</span>
                  {#if item.author}
                    <span>by {item.author}</span>
                  {/if}
                </div>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>

<!-- Feed Settings Modal -->
<FeedSettings 
  bind:show={showSettings}
  on:close={() => showSettings = false}
  on:update={() => loadFeeds(true)}
/>

<!-- Enhanced Toast Notification -->
{#if showingToast}
  <div class="fixed bottom-4 right-4 z-50 {toastType === 'success' ? 'bg-green-500' : toastType === 'warning' ? 'bg-orange-500' : 'bg-red-500'} text-white px-4 py-2 rounded-lg shadow-lg transition-all">
    {toastMessage}
  </div>
{/if}

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
</style>