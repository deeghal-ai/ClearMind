<script>
  import { onMount } from 'svelte';
  import Feeds from './pages/Feeds.svelte';
  import Roadmap from './pages/Roadmap.svelte';
  import Tracker from './pages/Tracker.svelte';
  import Login from './pages/Login.svelte';
  import RightChatPanel from './lib/components/RightChatPanel.svelte';
  import { navigation } from './lib/stores/navigation.js';
  import { chatPanel } from './lib/stores/chatPanel.js';
  import { authStore, isAuthenticated, userId as authUserId, userEmail, legacyUser } from './lib/stores/user.js';
  import { authService } from './lib/services/auth.js';
  import { router } from './lib/router.js';
  
  let userId = '';
  let isMobileNavOpen = true; // Default to open (showing thin navbar)
  
  // Remove Chat from navigation items
  const navigationItems = [
    { name: 'Roadmap', id: 'roadmap', emoji: '🎯', component: Roadmap },
    { name: 'Feeds', id: 'feeds', emoji: '📰', component: Feeds },
    { name: 'Tracker', id: 'tracker', emoji: '✅', component: Tracker }
  ];
  
  // Keyboard shortcut for chat
  function handleKeydown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === '/') {
      e.preventDefault();
      chatPanel.toggle();
    }
  }
  
  // Toggle mobile navigation
  function toggleMobileNav() {
    isMobileNavOpen = !isMobileNavOpen;
  }
  
  // Close mobile nav when clicking outside
  function closeMobileNav() {
    isMobileNavOpen = false;
  }
  
  // Handle navigation item click on mobile
  function handleNavClick(itemId) {
    navigation.setTab(itemId);
    // Don't auto-close on mobile since it's just a thin sidebar
  }
  
  onMount(async () => {
    // Initialize auth store
    await authStore.init();
    
    // Initialize legacy user store for backward compatibility
    legacyUser.init();
    
    // Setup keyboard shortcut
    document.addEventListener('keydown', handleKeydown);
    
    
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      authStore.cleanup();
      router.cleanup();
    };
  });
  
  // Reactive statements for auth integration
  $: {
    // Use auth user ID if available, otherwise fall back to legacy user ID
    if ($authUserId) {
      userId = $authUserId;
    } else if ($legacyUser && $legacyUser.id) {
      userId = $legacyUser.id;
    }
  }
  
  // Check if we should show login page - more robust logic
  $: showLogin = $router.path === '/login';
  
  // Handle auth callback
  $: if ($router.path === '/auth/callback') {
    // Redirect to main app after auth callback
    setTimeout(() => router.navigate('/'), 1000);
  }
  
  
  
  $: currentComponent = navigationItems.find(nav => nav.id === $navigation.currentTab)?.component;
</script>

{#if $router.path === '/auth/callback'}
  <!-- Auth Callback Loading Screen -->
  <div class="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center">
    <div class="text-center">
      <div class="mb-6 mt-4">
        <img src="/clearmind.png" alt="ClearMind Logo" class="w-36 h-36 mx-auto object-contain" onerror="this.style.display='none'" />
      </div>
      <h1 class="text-2xl font-bold text-gray-900 mb-2">ClearMind v2.1</h1>
      <div class="flex items-center justify-center space-x-2 text-gray-600">
        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
        <p>Signing you in...</p>
      </div>
    </div>
  </div>
{:else if showLogin}
  <!-- Login Page -->
  <Login />
{:else}
  <!-- Check if user is authenticated -->
  {#if !$isAuthenticated}
    <!-- Show login prompt for unauthenticated users -->
    <div class="min-h-screen flex items-center justify-center" style="background: linear-gradient(180deg, #14B8A6, #0F766E);">
      <div class="text-center max-w-md mx-4">
        <div class="mt-4">
          <img src="/clearmind.png" alt="ClearMind Logo" class="w-36 h-36 mx-auto object-contain" onerror="this.style.display='none'" />
        </div>
        <p class="text-xl font-medium text-white mb-6">Sign in to access your learning roadmaps, track progress, and chat with AI.</p>
        <a href="/login" class="btn-primary inline-block">Sign In to Continue</a>
      </div>
    </div>
  {:else}
  <!-- Main App -->
  <div class="min-h-screen flex" style="background-color: var(--color-zen-50);">
    <!-- Left Sidebar Navigation -->
    <aside 
      class="{isMobileNavOpen ? 'w-16' : 'w-0'} lg:w-64 min-h-screen flex flex-col transition-all duration-300 ease-in-out overflow-hidden" 
      style="background: linear-gradient(180deg, #14B8A6, #0F766E); border-right: 1px solid rgba(255,255,255,0.1);"
    >
    <!-- Logo Section -->
    <div class="pt-0 pb-6 border-b flex justify-center" style="border-color: rgba(255,255,255,0.1);">
      <img src="/clearmind.png" alt="ClearMind Logo" class="w-12 h-12 lg:w-36 lg:h-36" onerror="this.style.display='none'" />
    </div>
    
    <!-- Navigation Items -->
    <nav class="flex-1 p-4">
      <div class="space-y-2">
        {#each navigationItems as item}
          <button 
            on:click={() => handleNavClick(item.id)}
            class="w-full flex items-center justify-center lg:justify-start lg:space-x-3 px-2 lg:px-4 py-3 rounded-lg transition-all duration-200 text-left group
                   {$navigation.currentTab === item.id 
                     ? 'text-white shadow-lg' 
                     : 'text-gray-300 hover:text-white hover:bg-white/10'}"
            style="{$navigation.currentTab === item.id 
                     ? 'background: linear-gradient(135deg, #06B6D4, #0891B2); box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);' 
                     : ''}"
            title="{item.name}"
          >
            <span class="text-xl">{item.emoji}</span>
            <span class="font-medium hidden lg:inline">{item.name}</span>
          </button>
        {/each}
      </div>
    </nav>
    
    <!-- User Info Section -->
    <div class="p-2 lg:p-4 border-t space-y-2" style="border-color: rgba(255,255,255,0.1);">
      {#if $isAuthenticated}
        <!-- Authenticated User Info -->
        <div class="text-gray-300 text-sm lg:text-base">
          <p class="hidden lg:block truncate">{$userEmail}</p>
          <p class="lg:hidden text-center">👤</p>
        </div>
        <button 
          on:click={() => authService.signOut()}
          class="w-full flex items-center justify-center lg:justify-start lg:space-x-2 px-2 lg:px-3 py-2 rounded-lg transition-colors text-gray-300 hover:text-white hover:bg-white/10"
          title="Sign Out"
        >
          <span class="text-sm">🚪</span>
          <span class="text-sm hidden lg:inline">Sign Out</span>
        </button>
      {:else}
        <!-- Legacy User (for backward compatibility) -->
        <button 
          on:click={() => navigator.clipboard.writeText(`${window.location.origin}?user=${userId}`)}
          class="w-full flex items-center justify-center lg:justify-start lg:space-x-2 px-2 lg:px-3 py-2 rounded-lg transition-colors text-gray-300 hover:text-white hover:bg-white/10"
          title="Copy shareable URL"
        >
          <span class="text-sm">📋</span>
          {#if userId}
            <span class="text-sm font-mono hidden lg:inline">ID: {userId.slice(0, 8)}</span>
          {/if}
        </button>
      {/if}
    </div>
  </aside>
  
  <!-- Main Content Area -->
  <main class="flex-1 overflow-auto flex flex-col lg:ml-0">
    <!-- App Header -->
    <header class="bg-gradient-to-r from-white via-gray-50/95 to-white backdrop-blur-sm border-b border-gray-300/60 px-4 lg:px-8 py-3 shadow-sm">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <!-- Mobile Collapse Toggle -->
          <button 
            on:click={toggleMobileNav}
            class="lg:hidden p-2 rounded-lg text-gray-600 hover:text-gray-800 hover:bg-gray-100 transition-colors"
            title="{isMobileNavOpen ? 'Collapse' : 'Expand'} navigation"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {#if isMobileNavOpen}
                <!-- Collapse icon (left arrow) -->
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              {:else}
                <!-- Expand icon (right arrow) -->
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
              {/if}
            </svg>
          </button>
          
          <div class="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse shadow-sm"></div>
          <span class="text-lg font-semibold text-gray-800 tracking-wide">
            {$navigation.currentTab.charAt(0).toUpperCase() + $navigation.currentTab.slice(1)}
          </span>
        </div>
        
        <div class="flex items-center gap-4">
          <!-- Future buttons will go here -->
          <button 
            on:click={() => chatPanel.open()}
            class="flex items-center gap-3 px-3 py-1.5 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-full border border-teal-200/50 hover:from-teal-100 hover:to-cyan-100 hover:border-teal-300/50 transition-all duration-200 cursor-pointer"
            title="Open AI Chat"
          >
            <div class="w-2 h-2 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full animate-pulse"></div>
            <span class="text-sm font-medium text-teal-700">AI-Powered Learning</span>
          </button>
        </div>
      </div>
    </header>
    
    <!-- Page Content -->
    <div class="flex-1 px-4 lg:px-8 pt-4 pb-8">
      <div class="animate-fade-in space-zen-md">
        {#if currentComponent}
          <svelte:component this={currentComponent} {userId} />
        {/if}
      </div>
    </div>
  </main>
  
  <!-- Floating Action Button (All screens) -->
  {#if !$chatPanel.isOpen}
    <button
      on:click={() => chatPanel.open()}
      class="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-teal-500 to-teal-700 
             text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 
             flex items-center justify-center z-40 hover:from-teal-400 hover:to-teal-600"
      title="Open AI Chat (Cmd/Ctrl + /)"
    >
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
      </svg>
    </button>
  {/if}
  </div>
  
  <!-- Right Chat Panel (only show when authenticated) -->
  <RightChatPanel {userId} />
  {/if}
{/if}