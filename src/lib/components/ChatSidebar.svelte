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

<div class="h-full flex flex-col" style="background: transparent;">
  <!-- Contrasted Header with White Button -->
  <div class="p-4 border-b border-white/10">
    <button
      on:click={() => dispatch('newChat')}
      class="w-full px-4 py-3 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-gray-900 shadow-lg text-sm bg-white hover:bg-gray-50 hover:shadow-xl hover:-translate-y-0.5"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      New Chat
    </button>
  </div>
  
  <!-- Sessions List -->
  <div class="flex-1 overflow-y-auto">
    {#if sessions.length === 0}
      <p class="text-center text-sm p-6 text-white/60">
        No chat history yet
      </p>
    {:else}
      <div class="p-2 space-y-1">
        {#each sessions as session}
          <div class="relative group">
            <button
              on:click={() => dispatch('selectSession', session.id)}
              on:mouseenter={(e) => {
                if (currentSessionId !== session.id) {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              on:mouseleave={(e) => {
                if (currentSessionId !== session.id) {
                  e.target.style.background = 'transparent';
                }
              }}
              class="w-full text-left p-3 rounded-lg transition-all duration-200
                     {currentSessionId === session.id 
                       ? 'bg-white/10 backdrop-blur-sm border border-white/20 text-white shadow-lg' 
                       : 'text-white/70 hover:text-white hover:bg-white/5'}"
            >
              <div class="flex items-start gap-2">
                <span class="text-sm mt-0.5">
                  {contextIcons[session.context_type] || '💬'}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-xs truncate">
                    {session.title || 'New Chat'}
                  </p>
                  <p class="text-xs opacity-60 mt-0.5">
                    {formatDate(session.updated_at)}
                  </p>
                </div>
              </div>
            </button>
            
            <!-- Compact Delete button -->
            {#if showDeleteConfirm === session.id}
              <div class="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  on:click={() => deleteSession(session.id)}
                  class="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
                <button
                  on:click={() => showDeleteConfirm = null}
                  class="px-2 py-1 text-xs rounded transition-colors"
                  style="background: rgba(255, 255, 255, 0.2); color: white;"
                  onmouseover="this.style.background='rgba(255, 255, 255, 0.3)'"
                  onmouseout="this.style.background='rgba(255, 255, 255, 0.2)'"
                >
                  Cancel
                </button>
              </div>
            {:else}
              <button
                on:click|stopPropagation={() => showDeleteConfirm = session.id}
                class="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 
                       p-1 rounded transition-all"
                style="background: rgba(255, 255, 255, 0.1);"
                onmouseover="this.style.background='rgba(255, 255, 255, 0.2)'"
                onmouseout="this.style.background='rgba(255, 255, 255, 0.1)'"
              >
                <svg class="w-3 h-3 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
  <!-- Elegant Footer -->
  <div class="p-4 border-t border-white/10">
    <div class="text-xs space-y-1 text-white/50">
      <p class="font-medium">Model: GPT-4 Turbo</p>
      {#if $chatStore.currentSession?.total_tokens}
        <p>Tokens: {$chatStore.currentSession.total_tokens.toLocaleString()}</p>
      {/if}
    </div>
  </div>
</div>