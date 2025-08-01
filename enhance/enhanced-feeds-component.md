<!-- Enhanced Feeds.svelte -->
<script>
  import { onMount } from 'svelte';
  import { feedsStore } from '../lib/stores/feeds.js';
  import { navigation } from '../lib/stores/navigation.js';
  
  let selectedSource = 'all';
  let searchQuery = '';
  let viewMode = 'comfortable'; // 'comfortable' or 'compact'
  
  const sourceColors = {
    'HackerNews AI/ML': { bg: '#ff6600', text: 'white' },
    'ArXiv CS.AI': { bg: '#b31b1b', text: 'white' },
    'ArXiv CS.LG': { bg: '#1b4f72', text: 'white' },
    'Papers With Code': { bg: '#21c3d6', text: 'white' },
    'Reddit r/LocalLLaMA': { bg: '#ff4500', text: 'white' }
  };
  
  onMount(async () => {
    await feedsStore.loadFeeds();
  });
  
  async function handleRefresh() {
    await feedsStore.refreshFeeds(true);
  }
  
  async function handleClearCache() {
    feedsStore.clearCache();
  }
  
  $: filteredFeeds = $feedsStore.feeds.filter(feed => {
    if (selectedSource !== 'all' && feed.source?.name !== selectedSource) return false;
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      return feed.items.some(item => 
        item.title.toLowerCase().includes(search) ||
        item.description?.toLowerCase().includes(search)
      );
    }
    return true;
  });
  
  $: sources = ['all', ...new Set($feedsStore.feeds.map(f => f.source?.name).filter(Boolean))];
  
  function getSourceColor(source) {
    return sourceColors[source] || { bg: '#6b7280', text: 'white' };
  }
  
  function getRelativeTime(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    
    if (hours < 1) return 'just now';
    if (hours < 24) return `${hours}h ago`;
    if (hours < 168) return `${Math.floor(hours / 24)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  
  function getDomainFromUrl(url) {
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch {
      return '';
    }
  }
</script>

<div class="animate-fade-in">
  <!-- Enhanced Header -->
  <div class="mb-8">
    <h1 class="heading-1 mb-2">AI/ML Feeds</h1>
    <p class="text-secondary">
      {$feedsStore.stats.total} articles from {$feedsStore.stats.sources} sources
      {#if $feedsStore.lastSync}
        <span class="text-tertiary">• Updated {getRelativeTime($feedsStore.lastSync)}</span>
      {/if}
    </p>
  </div>

  <!-- Controls Bar -->
  <div class="card-zen p-4 mb-6">
    <div class="flex flex-col lg:flex-row gap-4">
      <!-- Search -->
      <div class="flex-1 relative">
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search articles..."
          class="input-zen pl-10 w-full"
        />
        <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zen-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      
      <!-- Source Filter -->
      <div class="flex gap-2 items-center">
        <select
          bind:value={selectedSource}
          class="input-zen px-3 py-2 pr-8 appearance-none bg-no-repeat bg-right"
          style="background-image: url('data:image/svg+xml;utf8,<svg fill="%23737373" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>'); background-position: right 0.5rem center; background-size: 1.5rem;"
        >
          {#each sources as source}
            <option value={source}>{source === 'all' ? 'All Sources' : source}</option>
          {/each}
        </select>
        
        <!-- View Mode Toggle -->
        <div class="flex bg-zen-100 rounded-lg p-1">
          <button
            on:click={() => viewMode = 'comfortable'}
            class="px-3 py-1 rounded text-sm font-medium transition-all
                   {viewMode === 'comfortable' ? 'bg-white text-zen-900 shadow-sm' : 'text-zen-600 hover:text-zen-900'}"
          >
            Comfortable
          </button>
          <button
            on:click={() => viewMode = 'compact'}
            class="px-3 py-1 rounded text-sm font-medium transition-all
                   {viewMode === 'compact' ? 'bg-white text-zen-900 shadow-sm' : 'text-zen-600 hover:text-zen-900'}"
          >
            Compact
          </button>
        </div>
        
        <!-- Actions -->
        <div class="flex gap-2 ml-2">
          <button
            on:click={handleRefresh}
            disabled={$feedsStore.loading}
            class="p-2 rounded-lg hover:bg-zen-100 transition-colors disabled:opacity-50"
            title="Refresh feeds"
          >
            <svg class="w-5 h-5 {$feedsStore.loading ? 'animate-spin' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>

  <!-- Feed Content -->
  {#if $feedsStore.loading && $feedsStore.feeds.length === 0}
    <div class="space-y-4">
      {#each Array(3) as _}
        <div class="card-zen p-6">
          <div class="loading h-6 w-32 mb-4 rounded"></div>
          <div class="space-y-3">
            <div class="loading h-4 w-full rounded"></div>
            <div class="loading h-4 w-3/4 rounded"></div>
          </div>
        </div>
      {/each}
    </div>
  {:else if $feedsStore.error}
    <div class="card-zen p-12 text-center">
      <div class="text-4xl mb-3">⚠️</div>
      <p class="text-zen-600">{$feedsStore.error}</p>
      <button on:click={handleRefresh} class="btn-primary mt-4">
        Try Again
      </button>
    </div>
  {:else if filteredFeeds.length === 0}
    <div class="card-zen p-12 text-center">
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <p class="empty-state-text">
          {searchQuery ? 'No articles match your search' : 'No articles available'}
        </p>
      </div>
    </div>
  {:else}
    <div class="space-y-4">
      {#each filteredFeeds as feed}
        <div class="feed-card group">
          <!-- Feed Header -->
          <div class="feed-card-header">
            <div class="flex items-center gap-3">
              <div 
                class="w-1 h-8 rounded-full transition-all group-hover:h-10"
                style="background-color: {getSourceColor(feed.source?.name).bg}"
              ></div>
              <div>
                <h3 class="font-medium text-zen-900">{feed.source?.name || 'Unknown Source'}</h3>
                <p class="text-tertiary">
                  {feed.success ? `${feed.items.length} articles` : 'Failed to load'}
                </p>
              </div>
            </div>
            
            {#if feed.source?.category}
              <span class="feed-source">
                {feed.source.category}
              </span>
            {/if}
          </div>
          
          <!-- Feed Items -->
          <div class="feed-card-body">
            {#if feed.success && feed.items.length > 0}
              {#each feed.items.slice(0, viewMode === 'compact' ? 3 : 5) as item}
                <a 
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  class="feed-item group/item"
                >
                  <h4 class="feed-title group-hover/item:text-blue-600">
                    {item.title}
                  </h4>
                  
                  {#if viewMode === 'comfortable' && item.description}
                    <p class="feed-description">
                      {item.description.replace(/<[^>]*>/g, '').slice(0, 150)}...
                    </p>
                  {/if}
                  
                  <div class="feed-meta">
                    <span>{getRelativeTime(item.pubDate)}</span>
                    {#if item.link}
                      <span>•</span>
                      <span>{getDomainFromUrl(item.link)}</span>
                    {/if}
                    {#if item.creator}
                      <span>•</span>
                      <span>by {item.creator}</span>
                    {/if}
                  </div>
                </a>
              {/each}
              
              {#if feed.items.length > (viewMode === 'compact' ? 3 : 5)}
                <button class="text-sm text-zen-600 hover:text-zen-900 font-medium">
                  View {feed.items.length - (viewMode === 'compact' ? 3 : 5)} more articles →
                </button>
              {/if}
            {:else}
              <p class="text-zen-500 text-sm">No articles available</p>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  /* Additional component-specific styles */
  .feed-card {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .feed-item {
    position: relative;
  }
  
  .feed-item::before {
    content: '';
    position: absolute;
    left: -1rem;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 0;
    background: var(--color-blue-accent);
    transition: height 0.2s ease;
    border-radius: 1.5px;
  }
  
  .feed-item:hover::before {
    height: 60%;
  }
  
  /* Smooth loading animation */
  @keyframes pulse {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 0.5; }
  }
  
  .animate-spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>