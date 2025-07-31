<script>
  import { onMount } from 'svelte';
  import { fetchAllFeeds } from '../lib/feedParser.js';
  import { getCachedFeeds, setCachedFeeds, clearFeedCache, getCacheAge } from '../lib/feedCache.js';
  import { getFeedCategory, getCategoryColor } from '../lib/feedSources.js';
  
  export let userId;
  
  let feeds = [];
  let loading = true;
  let refreshing = false;
  let error = null;
  let lastUpdated = null;
  let cacheAge = null;
  let searchTerm = '';
  let selectedCategory = 'all';
  let collapsedSources = new Set();
  
  // Categories for filtering
  const categories = [
    { id: 'all', name: 'All Sources', count: 0 },
    { id: 'news', name: 'News', count: 0 },
    { id: 'research', name: 'Research', count: 0 },
    { id: 'community', name: 'Community', count: 0 }
  ];
  
  onMount(async () => {
    await loadFeeds();
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
        console.log('Fetching fresh feeds...');
        feedData = await fetchAllFeeds();
        
        // Cache the results
        setCachedFeeds(feedData);
        cacheAge = 0;
      }
      
      feeds = feedData.feeds || [];
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
    collapsedSources = collapsedSources; // Trigger reactivity
  }
  
  // Filter feeds based on search and category
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
        item.description.toLowerCase().includes(searchLower)
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
  
  // Simple toast notification
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
  <!-- Header -->
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
    <div>
      <h1 class="text-2xl font-semibold">AI/ML Feeds</h1>
      {#if lastUpdated}
        <p class="text-sm text-zen-gray-500 mt-1">
          Last updated: {formatTimeAgo(lastUpdated)}
          {#if cacheAge !== null}
            • Cached {formatCacheAge(cacheAge)}
          {/if}
        </p>
      {/if}
    </div>
    
    <div class="flex gap-2">
      <button 
        class="btn-primary {refreshing ? 'opacity-50 cursor-not-allowed' : ''}" 
        on:click={refreshFeeds} 
        disabled={refreshing}
        title="Refresh all feeds"
      >
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
  
  <!-- Search and Filters -->
  <div class="card-zen">
    <div class="flex flex-col sm:flex-row gap-4">
      <!-- Search -->
      <div class="flex-1">
        <input
          type="text"
          bind:value={searchTerm}
          placeholder="Search feeds, titles, or content..."
          class="w-full px-4 py-2 border border-zen-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>
      
      <!-- Category Filter -->
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
          <div class="loading h-6 w-48 mb-4"></div>
          <div class="space-y-3">
            {#each Array(3) as _}
              <div class="loading h-16"></div>
            {/each}
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
      <button class="btn-primary" on:click={() => loadFeeds(true)}>
        Try Again
      </button>
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
      {/if}
    </div>
  
  {:else}
    <!-- Feed Sources -->
    {#each filteredFeeds as feed}
      <div class="card-zen">
        <!-- Source Header -->
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
              </div>
            </div>
          </div>
          
          {#if feed.error}
            <span class="text-red-500 text-sm" title={feed.error}>⚠️</span>
          {:else}
            <span class="text-green-500 text-sm">✅</span>
          {/if}
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
                <p class="text-xs text-zen-gray-400">
                  {formatTimeAgo(item.pubDate)}
                </p>
              </a>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  {/if}
</div>

<!-- Toast Notification -->
{#if showingToast}
  <div class="fixed bottom-4 right-4 z-50 {toastType === 'success' ? 'bg-green-500' : 'bg-orange-500'} text-white px-4 py-2 rounded-lg shadow-lg transition-all">
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
</style>