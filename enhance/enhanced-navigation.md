<!-- Enhanced Navigation Section for App.svelte -->
<script>
  // Add this to your existing script section
  let isScrolled = false;
  
  onMount(() => {
    // ... existing onMount code ...
    
    // Add scroll listener for header effect
    const handleScroll = () => {
      isScrolled = window.scrollY > 10;
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  });
</script>

<!-- Replace your existing header and nav with this -->
<div class="min-h-screen bg-zen-50">
  <!-- Enhanced Header -->
  <header class="sticky top-0 z-20 transition-all duration-300
                 {isScrolled ? 'app-header shadow-sm' : 'bg-white'}">
    <div class="container-zen">
      <div class="flex items-center justify-between h-16">
        <!-- Logo/Brand -->
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <span class="text-white text-xl">🧠</span>
            </div>
            <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <h1 class="font-semibold text-lg text-zen-900 tracking-tight">ClearMind</h1>
            <p class="text-xs text-zen-500 -mt-0.5">Your Learning Sanctuary</p>
          </div>
        </div>
        
        <!-- User Info -->
        <div class="flex items-center gap-4">
          <!-- Quick Stats -->
          <div class="hidden md:flex items-center gap-4 text-xs">
            <div class="flex items-center gap-1.5">
              <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span class="text-zen-600">Active</span>
            </div>
            {#if userId}
              <div class="text-zen-400">|</div>
              <span class="text-zen-500 font-mono">
                {userId.slice(0, 8)}
              </span>
            {/if}
          </div>
          
          <!-- User Avatar -->
          <div class="w-8 h-8 bg-gradient-to-br from-zen-200 to-zen-300 rounded-full flex items-center justify-center">
            <svg class="w-5 h-5 text-zen-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </header>
  
  <!-- Enhanced Navigation -->
  <nav class="sticky top-16 z-10 bg-white/80 backdrop-blur-sm border-b border-zen-100">
    <div class="container-zen">
      <div class="flex items-center gap-2 py-2">
        {#each navigationItems as item}
          <button 
            on:click={() => navigation.setTab(item.id)}
            class="tab-nav
                   {$navigation.currentTab === item.id ? 'tab-active' : 'tab-inactive'}"
          >
            <span class="text-lg mr-2.5 opacity-80">{item.emoji}</span>
            <span class="font-medium">{item.name}</span>
            
            <!-- Active indicator -->
            {#if $navigation.currentTab === item.id}
              <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-zen-900 rounded-full"></div>
            {/if}
            
            <!-- Notification dot (example for feeds) -->
            {#if item.id === 'feeds' && $feedsStore?.newItems > 0}
              <span class="ml-2 px-1.5 py-0.5 bg-blue-500 text-white text-xs rounded-full">
                {$feedsStore.newItems}
              </span>
            {/if}
          </button>
        {/each}
        
        <!-- Quick Actions -->
        <div class="ml-auto flex items-center gap-2">
          <!-- Command palette trigger -->
          <button class="p-2 text-zen-500 hover:text-zen-700 hover:bg-zen-50 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          
          <!-- Settings -->
          <button class="p-2 text-zen-500 hover:text-zen-700 hover:bg-zen-50 rounded-lg transition-colors">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  </nav>
  
  <!-- Main Content with proper spacing -->
  <main class="container-zen py-8">
    <div class="animate-fade-in">
      {#if currentComponent}
        <svelte:component this={currentComponent} {userId} />
      {/if}
    </div>
  </main>
  
  <!-- Optional: Floating Action Button for primary action -->
  <button class="fixed bottom-6 right-6 w-14 h-14 bg-zen-900 text-white rounded-full shadow-lg 
                 hover:shadow-xl hover:scale-105 transition-all duration-200 flex items-center justify-center group">
    <svg class="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
    </svg>
  </button>
</div>

<style>
  /* Additional navigation-specific animations */
  .tab-nav {
    position: relative;
    overflow: hidden;
  }
  
  .tab-nav::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: radial-gradient(circle, rgba(59, 130, 246, 0.1) 0%, transparent 70%);
    transform: scale(0);
    transition: transform 0.3s ease;
  }
  
  .tab-nav:active::before {
    transform: scale(2);
  }
  
  /* Smooth header transition */
  header {
    transition: background-color 0.3s ease, box-shadow 0.3s ease;
  }
  
  /* Premium focus styles */
  button:focus-visible {
    outline: 2px solid rgba(59, 130, 246, 0.5);
    outline-offset: 2px;
  }
</style>