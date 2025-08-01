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

<div class="min-h-screen" style="background-color: var(--color-zen-50);">
  <!-- Header -->
  <header class="bg-white border-b" style="border-color: var(--color-border-light);">
    <div class="container-zen">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center space-x-2">
          <span class="text-2xl">🧠</span>
          <span class="font-semibold text-lg" style="color: var(--color-zen-900);">ClearMind</span>
        </div>
        <button 
          on:click={() => navigator.clipboard.writeText(`${window.location.origin}?user=${userId}`)}
          class="text-sm transition-colors"
          style="color: var(--color-zen-500);"
          onmouseover="this.style.color='var(--color-zen-700)'"
          onmouseout="this.style.color='var(--color-zen-500)'"
          title="Copy shareable URL"
        >
          {#if userId}
            📋 ID: {userId.slice(0, 8)}
          {/if}
        </button>
      </div>
    </div>
  </header>
  
  <!-- Navigation -->
  <nav class="bg-white/50 backdrop-blur-sm border-b sticky top-0 z-10" style="border-color: var(--color-border-light);">
    <div class="container-zen">
      <div class="flex space-x-1 py-2">
        {#each navigationItems as item}
          <button 
            on:click={() => navigation.setTab(item.id)}
            class="tab-nav
                   {$navigation.currentTab === item.id ? 'tab-active' : 'tab-inactive'}"
          >
            <span class="text-lg mr-2">{item.emoji}</span>
            <span>{item.name}</span>
          </button>
        {/each}
      </div>
    </div>
  </nav>
  
  <!-- Main Content -->
  <main class="container-zen py-8">
    <div class="animate-fade-in space-zen-md">
      {#if currentComponent}
        <svelte:component this={currentComponent} {userId} />
      {/if}
    </div>
  </main>
</div>