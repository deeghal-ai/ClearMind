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
    userId = localStorage.getItem('learningos_user_id') || '';
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('learningos_user_id', userId);
    }
  });
  
  $: currentComponent = navigationItems.find(nav => nav.id === $navigation.currentTab)?.component;
</script>

<div class="min-h-screen bg-gray-50">
  <!-- Header -->
  <header class="bg-white border-b border-gray-200">
    <div class="container-zen">
      <div class="flex items-center justify-between h-16">
        <div class="flex items-center space-x-2">
          <span class="text-2xl">🧠</span>
          <span class="font-semibold text-lg">ClearMind</span>
        </div>
        <span class="text-sm text-gray-500">
          {#if userId}
            ID: {userId.slice(0, 8)}
          {/if}
        </span>
      </div>
    </div>
  </header>
  
  <!-- Navigation -->
  <nav class="bg-white border-b border-gray-100 sticky top-0 z-10">
    <div class="container-zen">
      <div class="flex space-x-1">
        {#each navigationItems as item}
          <button 
            on:click={() => navigation.setTab(item.id)}
            class="flex items-center px-4 py-3 text-sm font-medium rounded-t-lg
                   transition-all duration-200
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
    {#if currentComponent}
      <svelte:component this={currentComponent} {userId} />
    {/if}
  </main>
</div>