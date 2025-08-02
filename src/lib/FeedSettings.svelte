<script>
  import { createEventDispatcher } from 'svelte';
  import { feedStorageService } from './services/feedStorageService.js';
  
  export let show = false;
  export let userId = '';
  
  const dispatch = createEventDispatcher();
  
  let sources = [];
  let loading = true;
  let newFeedName = '';
  let newFeedUrl = '';
  let addingFeed = false;
  
  async function toggleSource(sourceId) {
    const source = sources.find(s => s.id === sourceId);
    if (!source) return;
    
    try {
      const newState = await feedStorageService.toggleFeedState(userId, sourceId);
      source.active = newState;
      sources = sources; // Trigger reactivity
      showToast(newState ? 'Feed enabled' : 'Feed disabled');
    } catch (error) {
      console.error('Failed to toggle feed:', error);
      showToast('Failed to update feed');
    }
  }
  
  async function addCustomFeed() {
    if (!newFeedName.trim() || !newFeedUrl.trim()) return;
    
    addingFeed = true;
    
    try {
      const newFeed = await feedStorageService.addCustomFeed(userId, {
        name: newFeedName.trim(),
        url: newFeedUrl.trim()
      });
      
      sources = [...sources, newFeed];
      
      // Reset form
      newFeedName = '';
      newFeedUrl = '';
      
      showToast('Custom feed added successfully!');
    } catch (error) {
      console.error('Failed to add custom feed:', error);
      showToast('Failed to add custom feed');
    } finally {
      addingFeed = false;
    }
  }
  
  async function removeCustomFeed(sourceId) {
    try {
      await feedStorageService.removeCustomFeed(userId, sourceId);
      sources = sources.filter(s => s.id !== sourceId);
      showToast('Custom feed removed');
    } catch (error) {
      console.error('Failed to remove custom feed:', error);
      showToast('Failed to remove custom feed');
    }
  }
  
  function showToast(message) {
    // Simple toast notification
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 2000);
  }
  
  function close() {
    dispatch('close');
    dispatch('update'); // Trigger feeds refresh
  }
  
  // Load all feeds from Supabase
  async function loadFeeds() {
    if (!userId) {
      console.warn('No userId provided to FeedSettings');
      loading = false;
      return;
    }
    
    try {
      loading = true;
      sources = await feedStorageService.getFeedSources(userId);
    } catch (error) {
      console.error('Failed to load feeds:', error);
      showToast('Failed to load feeds');
    } finally {
      loading = false;
    }
  }
  
  $: if (show) {
    loadFeeds();
  }
</script>

{#if show}
  <div class="fixed inset-0 z-50 overflow-y-auto">
    <div class="flex items-center justify-center min-h-screen px-4">
      <!-- Backdrop -->
      <div 
        class="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        role="button"
        tabindex="0"
        on:click={close}
        on:keydown={(e) => e.key === 'Escape' && close()}
        aria-label="Close modal"
      ></div>
      
      <!-- Modal -->
      <div class="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        <div class="p-6 border-b border-gray-200">
          <div class="flex items-center justify-between">
            <div>
              <h2 class="text-xl font-semibold">Feed Settings</h2>
              <p class="text-sm text-gray-600 mt-1">Manage your RSS feed sources</p>
            </div>
            <button
              on:click={close}
              class="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div class="p-6 overflow-y-auto max-h-[60vh] space-y-6">
          <!-- Default Sources -->
          <div>
            <h3 class="font-medium text-gray-800 mb-3">Default Sources</h3>
            <div class="space-y-2">
              {#each sources.filter(s => !s.id.startsWith('custom_')) as source}
                <div class="flex items-center p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <input
                    type="checkbox"
                    checked={source.active}
                    on:change={() => toggleSource(source.id)}
                    class="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mr-3"
                  />
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2">
                      <p class="font-medium text-gray-800">{source.id.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}</p>
                      <span class="text-xs px-2 py-1 rounded-full border {source.category === 'news' ? 'bg-blue-50 text-blue-700 border-blue-200' : source.category === 'research' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-green-50 text-green-700 border-green-200'}">
                        {source.category}
                      </span>
                    </div>
                    <p class="text-xs text-gray-500 truncate mt-1">{source.description}</p>
                  </div>
                </div>
              {/each}
            </div>
          </div>
          
          <!-- Custom Sources -->
          {#if sources.some(s => s.id.startsWith('custom_'))}
            <div>
              <h3 class="font-medium text-gray-800 mb-3">Custom Sources</h3>
              <div class="space-y-2">
                {#each sources.filter(s => s.id.startsWith('custom_')) as source}
                  <div class="flex items-center p-3 rounded-lg bg-gray-50">
                    <input
                      type="checkbox"
                      checked={source.active}
                      on:change={() => toggleSource(source.id)}
                      class="h-4 w-4 text-blue-600 rounded focus:ring-blue-500 mr-3"
                    />
                    <div class="flex-1 min-w-0">
                      <p class="font-medium text-gray-800">{source.description}</p>
                      <p class="text-xs text-gray-500 truncate">{source.url}</p>
                    </div>
                    <button
                      on:click={() => removeCustomFeed(source.id)}
                      class="ml-2 text-red-500 hover:text-red-700 transition-colors"
                      title="Remove custom feed"
                    >
                      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
          
          <!-- Add Custom Feed -->
          <div class="border-t border-gray-200 pt-6">
            <h3 class="font-medium text-gray-800 mb-3">Add Custom RSS Feed</h3>
            <form on:submit|preventDefault={addCustomFeed} class="space-y-3">
              <input
                bind:value={newFeedName}
                type="text"
                placeholder="Feed name (e.g. 'My AI Blog')"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <input
                bind:value={newFeedUrl}
                type="url"
                placeholder="RSS feed URL (e.g. https://example.com/feed.xml)"
                required
                class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <button
                type="submit"
                disabled={addingFeed || !newFeedName.trim() || !newFeedUrl.trim()}
                class="btn-primary w-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {addingFeed ? 'Adding...' : 'Add Custom Feed'}
              </button>
            </form>
            
            <div class="mt-3 p-3 bg-blue-50 rounded-lg">
              <p class="text-xs text-blue-800">
                <strong>Tip:</strong> You can add any RSS or Atom feed URL. Popular options include Medium publications, 
                personal blogs, or specialized AI newsletters.
              </p>
            </div>
          </div>
        </div>
        
        <div class="p-6 border-t border-gray-200 bg-gray-50">
          <div class="flex justify-end gap-3">
            <button
              on:click={close}
              class="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}