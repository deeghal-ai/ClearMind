<script>
  import { createEventDispatcher } from 'svelte';
  import { chatStore } from '../stores/chat.js';
  
  export let sessions = [];
  export let currentSessionId = null;
  
  const dispatch = createEventDispatcher();
  
  let showDeleteConfirm = null;
  
  const contextIcons = {
    general: '💬',
    roadmap: '🎯',
    feeds: '📰',
    mixed: '🌐'
  };
  
  async function deleteSession(sessionId) {
    const success = await chatStore.deleteSession(sessionId);
    if (success && currentSessionId === sessionId) {
      dispatch('newChat');
    }
    showDeleteConfirm = null;
  }
  
  function formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return d.toLocaleDateString();
  }
</script>

<div class="h-full bg-gray-50 border-r border-gray-200 flex flex-col">
  <!-- Header -->
  <div class="p-4 border-b border-gray-200">
    <button
      on:click={() => dispatch('newChat')}
      class="w-full btn-primary flex items-center justify-center gap-2"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      New Chat
    </button>
  </div>
  
  <!-- Sessions List -->
  <div class="flex-1 overflow-y-auto">
    {#if sessions.length === 0}
      <p class="text-center text-gray-500 text-sm p-4">
        No chat history yet
      </p>
    {:else}
      <div class="p-2 space-y-1">
        {#each sessions as session}
          <div class="relative group">
            <button
              on:click={() => dispatch('selectSession', session.id)}
              class="w-full text-left p-3 rounded-lg transition-colors
                     {currentSessionId === session.id 
                       ? 'bg-blue-100 text-blue-900' 
                       : 'hover:bg-gray-100'}"
            >
              <div class="flex items-start gap-2">
                <span class="text-lg">
                  {contextIcons[session.context_type] || '💬'}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-sm truncate">
                    {session.title || 'New Chat'}
                  </p>
                  <p class="text-xs text-gray-500">
                    {formatDate(session.updated_at)}
                  </p>
                </div>
              </div>
            </button>
            
            <!-- Delete button -->
            {#if showDeleteConfirm === session.id}
              <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  on:click={() => deleteSession(session.id)}
                  class="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                >
                  Delete
                </button>
                <button
                  on:click={() => showDeleteConfirm = null}
                  class="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            {:else}
              <button
                on:click|stopPropagation={() => showDeleteConfirm = session.id}
                class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 
                       p-1 hover:bg-gray-200 rounded transition-opacity"
              >
                <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
  <!-- Footer -->
  <div class="p-4 border-t border-gray-200">
    <div class="text-xs text-gray-500 space-y-1">
      <p>Model: GPT-4 Turbo</p>
      {#if $chatStore.currentSession?.total_tokens}
        <p>Tokens used: {$chatStore.currentSession.total_tokens.toLocaleString()}</p>
      {/if}
    </div>
  </div>
</div>