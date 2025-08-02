<script>
  import { onMount, onDestroy } from 'svelte';
  import { fetchAllFeedsEnhanced, groupFeedsByCategory } from '../lib/feedParserEnhanced.js';
  import { getCachedFeeds, setCachedFeeds, clearFeedCache, getCacheAge } from '../lib/feedCache.js';
  import { getFeedCategory, getCategoryColor } from '../lib/feedSources.js';
  import { feedStorageService } from '../lib/services/feedStorageService.js';
  import FeedSettings from '../lib/FeedSettings.svelte';
  
  export let userId = '';
  
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
  let viewMode = 'comfortable'; // 'comfortable' or 'compact'
  
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
      
      // Filter out disabled feeds using Supabase
      let enabledSources = [];
      if (userId) {
        try {
          const userFeeds = await feedStorageService.getEnabledFeedSources(userId);
          enabledSources = userFeeds.map(feed => feed.id);
        } catch (error) {
          console.error('Failed to get enabled feeds from database:', error);
          // Fallback to showing all feeds if database query fails
          enabledSources = feedData.feeds?.map(feed => feed.source) || [];
        }
      } else {
        // No userId, show all feeds
        enabledSources = feedData.feeds?.map(feed => feed.source) || [];
      }
      
      feeds = (feedData.feeds || []).filter(feed => {
        return enabledSources.includes(feed.source);
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
      <div class="flex items-center gap-4 text-sm text-gray-500 mt-1">
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
        class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
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
        class="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        on:click={clearCache}
        title="Clear cache"
      >
        Clear Cache
      </button>
    </div>
  </div>
  
  <!-- Enhanced Search and Filters -->
  <div class="card-zen p-4">
    <div class="flex flex-col lg:flex-row gap-4">
      <!-- Search with icon -->
      <div class="flex-1 relative">
        <svg class="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          bind:value={searchTerm}
          placeholder="Search feeds, titles, or content..."
          class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <!-- Category Filter with counts -->
      <div class="sm:w-48">
        <select 
          bind:value={selectedCategory}
          class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {#each categories as category}
            <option value={category.id}>
              {category.name} ({category.count})
            </option>
          {/each}
        </select>
      </div>

      <!-- View Mode Toggle -->
      <div class="flex bg-gray-100 rounded-lg p-1">
        <button
          on:click={() => viewMode = 'comfortable'}
          class="px-3 py-1 rounded text-sm font-medium transition-all
                 {viewMode === 'comfortable' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
        >
          Comfortable
        </button>
        <button
          on:click={() => viewMode = 'compact'}
          class="px-3 py-1 rounded text-sm font-medium transition-all
                 {viewMode === 'compact' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}"
        >
          Compact
        </button>
      </div>
    </div>
  </div>
  
  <!-- Loading State -->
  {#if loading}
    <div class="grid gap-6 {viewMode === 'compact' ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'}">
      {#each Array(6) as _}
        <div class="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div class="animate-pulse">
            <!-- Header -->
            <div class="p-4 border-b border-gray-100 bg-gray-50">
              <div class="flex items-center gap-3">
                <div class="w-1 h-8 bg-gray-300 rounded-full"></div>
                <div class="flex-1">
                  <div class="h-4 w-32 bg-gray-300 rounded mb-2"></div>
                  <div class="h-3 w-24 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
            <!-- Content -->
            <div class="p-4 space-y-3">
              <div class="h-4 w-full bg-gray-200 rounded"></div>
              <div class="h-4 w-4/5 bg-gray-200 rounded"></div>
              <div class="h-3 w-1/2 bg-gray-100 rounded"></div>
              <div class="h-4 w-full bg-gray-200 rounded"></div>
              <div class="h-4 w-3/4 bg-gray-200 rounded"></div>
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
      <p class="text-gray-500">
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
            class="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            on:click={() => showSettings = true}
          >
            Check Settings
          </button>
        </div>
      {/if}
    </div>
  
  {:else}
    <!-- Beautiful Grid Layout -->
    <div class="grid gap-6 {viewMode === 'compact' ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'}">
      {#each filteredFeeds as feed}
        <div class="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 overflow-hidden">
          <!-- Source Header -->
          <div class="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div 
                  class="w-1 h-8 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 transition-all group-hover:h-10"
                ></div>
                <div>
                  <h3 class="font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                    {feed.source}
                  </h3>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-medium">
                      {getFeedCategory(feed.source)}
                    </span>
                    <span class="text-xs text-gray-500">
                      {feed.success ? `${feed.items.length} articles` : 'Failed to load'}
                    </span>
                  </div>
                </div>
              </div>
              
              <div class="flex items-center gap-2">
                {#if feed.error}
                  <div class="w-2 h-2 rounded-full bg-red-500" title={feed.error}></div>
                {:else}
                  <div class="w-2 h-2 rounded-full bg-green-500"></div>
                {/if}
              </div>
            </div>
          </div>
          
          <!-- Feed Items -->
          <div class="p-4">
            {#if feed.success && feed.items.length > 0}
              <div class="space-y-3">
                {#each feed.items.slice(0, viewMode === 'compact' ? 3 : 4) as item}
                  <a 
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="block p-3 -mx-3 rounded-lg hover:bg-blue-50 transition-all duration-200 group/item border-l-2 border-transparent hover:border-blue-400"
                  >
                    <h4 class="font-medium text-gray-900 group-hover/item:text-blue-600 transition-colors leading-snug {viewMode === 'compact' ? 'text-sm' : 'text-base'} line-clamp-2">
                      {item.title}
                    </h4>
                    
                    {#if viewMode === 'comfortable' && item.description}
                      <p class="text-sm text-gray-600 mt-1 leading-relaxed line-clamp-2">
                        {item.description.replace(/<[^>]*>/g, '').slice(0, 120)}...
                      </p>
                    {/if}
                    
                    <div class="flex items-center justify-between text-xs text-gray-500 mt-2">
                      <span class="font-medium">{formatTimeAgo(item.pubDate)}</span>
                      {#if item.author}
                        <span class="text-gray-400">by {item.author}</span>
                      {/if}
                    </div>
                  </a>
                {/each}
                
                {#if feed.items.length > (viewMode === 'compact' ? 3 : 4)}
                  <div class="pt-2 border-t border-gray-100">
                    <button 
                      on:click={() => toggleSource(feed.source)}
                      class="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors flex items-center gap-1"
                    >
                      {collapsedSources.has(feed.source) ? 'Show' : 'View'} {feed.items.length - (viewMode === 'compact' ? 3 : 4)} more articles
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                {/if}
              </div>
            {:else}
              <div class="text-center py-8">
                <div class="text-gray-400 text-4xl mb-2">📰</div>
                <p class="text-gray-500 text-sm">No articles available</p>
              </div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- Feed Settings Modal -->
<FeedSettings 
  bind:show={showSettings}
  {userId}
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