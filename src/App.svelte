<script>
  import { onMount } from 'svelte';
  import Feeds from './pages/Feeds.svelte';
  import Roadmap from './pages/Roadmap.svelte';
  import Tracker from './pages/Tracker.svelte';
  import RightChatPanel from './lib/components/RightChatPanel.svelte';
  import { navigation } from './lib/stores/navigation.js';
  import { chatPanel } from './lib/stores/chatPanel.js';
  
  let userId = '';
  
  // Remove Chat from navigation items
  const navigationItems = [
    { name: 'Feeds', id: 'feeds', emoji: '📰', component: Feeds },
    { name: 'Roadmap', id: 'roadmap', emoji: '🎯', component: Roadmap },
    { name: 'Tracker', id: 'tracker', emoji: '✅', component: Tracker }
  ];
  
  // Keyboard shortcut for chat
  function handleKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === '/') {
      e.preventDefault();
      chatPanel.toggle();
    }
  }
  
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
    
    // Setup keyboard shortcut
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
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
  <main class="flex-1 overflow-auto flex flex-col">
    <!-- App Header -->
    <header class="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 px-8 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-3">
            <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span class="text-sm font-medium text-gray-700">
              {$navigation.currentTab.charAt(0).toUpperCase() + $navigation.currentTab.slice(1)}
            </span>
          </div>
          
          {#if userId}
            <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
              <svg class="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span class="text-xs font-mono text-gray-600">{userId.slice(0, 8)}</span>
            </div>
          {/if}
        </div>
        
        <div class="flex items-center gap-3">
          <!-- Future buttons will go here -->
          <div class="flex items-center gap-2 text-xs text-gray-500">
            <div class="w-1 h-1 bg-gray-400 rounded-full"></div>
            <span>AI-Powered Learning</span>
          </div>
        </div>
      </div>
    </header>
    
    <!-- Page Content -->
    <div class="flex-1 p-8">
      <div class="animate-fade-in space-zen-md">
        {#if currentComponent}
          <svelte:component this={currentComponent} {userId} />
        {/if}
      </div>
    </div>
  </main>
  
  <!-- Right Chat Panel -->
  <RightChatPanel {userId} />
  
  <!-- Floating Action Button (All screens) -->
  {#if !$chatPanel.isOpen}
    <button
      on:click={() => chatPanel.open()}
      class="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 
             text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 
             flex items-center justify-center z-40"
      title="Open AI Chat (Cmd/Ctrl + /)"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
      </svg>
    </button>
  {/if}
</div>