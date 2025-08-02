<script>
  import { onMount } from 'svelte';
  import Feeds from './pages/Feeds.svelte';
  import Roadmap from './pages/Roadmap.svelte';
  import Chat from './pages/Chat.svelte';
  import Tracker from './pages/Tracker.svelte';
  import { navigation } from './lib/stores/navigation.js';
  
  let userId = '';
  
  const navigationItems = [
    { name: 'Feeds', id: 'feeds', emoji: '📰', component: Feeds },
    { name: 'Roadmap', id: 'roadmap', emoji: '🎯', component: Roadmap },
    { name: 'Chat', id: 'chat', emoji: '💬', component: Chat },
    { name: 'Tracker', id: 'tracker', emoji: '✅', component: Tracker }
  ];
  
  onMount(() => {
    // Check URL for user ID first
    const urlParams = new URLSearchParams(window.location.search);
    const urlUserId = urlParams.get('user');
    
    if (urlUserId) {
      // Use URL user ID and save it
      userId = urlUserId;
      localStorage.setItem('learningos_user_id', userId);
    } else {
      // Use localStorage or create new
      userId = localStorage.getItem('learningos_user_id') || '';
      if (!userId) {
        userId = 'user_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('learningos_user_id', userId);
      }
    }
  });
  
  $: currentComponent = navigationItems.find(nav => nav.id === $navigation.currentTab)?.component;
</script>

<div class="min-h-screen flex" style="background-color: var(--color-zen-50);">
  <!-- Left Sidebar Navigation -->
  <aside class="w-64 min-h-screen flex flex-col" style="background: linear-gradient(180deg, #14B8A6, #0F766E); border-right: 1px solid rgba(255,255,255,0.1);">
    <!-- Logo Section -->
    <div class="p-6 border-b" style="border-color: rgba(255,255,255,0.1);">
      <div class="flex items-center space-x-3">
        <img src="/clearmind.png" alt="ClearMind Logo" class="w-32 h-32" />

      </div>
    </div>
    
    <!-- Navigation Items -->
    <nav class="flex-1 p-4">
      <div class="space-y-2">
        {#each navigationItems as item}
          <button 
            on:click={() => navigation.setTab(item.id)}
            class="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-left group
                   {$navigation.currentTab === item.id 
                     ? 'text-white shadow-lg' 
                     : 'text-gray-300 hover:text-white hover:bg-white/10'}"
            style="{$navigation.currentTab === item.id 
                     ? 'background: linear-gradient(135deg, #06B6D4, #0891B2); box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);' 
                     : ''}"
          >
            <span class="text-xl">{item.emoji}</span>
            <span class="font-medium">{item.name}</span>
          </button>
        {/each}
      </div>
    </nav>
    
    <!-- User Info Section -->
    <div class="p-4 border-t" style="border-color: rgba(255,255,255,0.1);">
      <button 
        on:click={() => navigator.clipboard.writeText(`${window.location.origin}?user=${userId}`)}
        class="w-full flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors text-gray-300 hover:text-white hover:bg-white/10"
        title="Copy shareable URL"
      >
        <span class="text-sm">📋</span>
        {#if userId}
          <span class="text-sm font-mono">ID: {userId.slice(0, 8)}</span>
        {/if}
      </button>
    </div>
  </aside>
  
  <!-- Main Content Area -->
  <main class="flex-1 overflow-auto">
    <div class="p-8">
      <div class="animate-fade-in space-zen-md">
        {#if currentComponent}
          <svelte:component this={currentComponent} {userId} />
        {/if}
      </div>
    </div>
  </main>
</div>