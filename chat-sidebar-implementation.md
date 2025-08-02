# ClearMind Chat Sidebar Implementation Plan

## Overview
Transform the chat functionality from a dedicated page/tab into a collapsible right sidebar panel, creating a more integrated and modern experience similar to AI-powered code editors.

## Design Philosophy Alignment
This change aligns with the core ClearMind philosophy:
- **Minimalism**: Chat becomes a supporting tool, not a primary navigation item
- **Focus**: Maintains single-purpose screens while providing contextual assistance
- **Calm**: Reduces navigation complexity and creates a more unified experience
- **Space**: Chat appears when needed, disappears when not

## Architecture Changes

### 1. Navigation Structure Update
**Current**: 4 tabs (Feeds, Roadmap, Chat, Tracker)  
**New**: 3 tabs (Feeds, Roadmap, Tracker) + Right sidebar chat

### 2. Component Hierarchy
```
App.svelte
├── LeftSidebar (existing navigation)
├── MainContent (current tab content)
└── RightChatPanel (new component)
    ├── ChatHeader
    ├── ChatHistory (collapsible)
    ├── MessageArea
    └── InputArea
```

### 3. State Management Updates
- Add `chatPanel` store for managing sidebar state
- Update navigation store to remove chat tab
- Maintain existing chat store functionality

## Implementation Steps

### Phase 1: Create Chat Panel Infrastructure

#### Step 1.1: Create Chat Panel Store
**File**: `src/lib/stores/chatPanel.js`
```javascript
import { writable } from 'svelte/store';

function createChatPanelStore() {
  const { subscribe, set, update } = writable({
    isOpen: false,
    width: 380, // Default width in pixels
    activeView: 'chat', // 'chat' | 'history'
    isHistoryExpanded: false,
    pendingContext: null // For context passed from other components
  });

  return {
    subscribe,
    toggle: () => update(state => ({ ...state, isOpen: !state.isOpen })),
    open: () => update(state => ({ ...state, isOpen: true })),
    close: () => update(state => ({ ...state, isOpen: false })),
    setWidth: (width) => update(state => ({ ...state, width })),
    toggleHistory: () => update(state => ({ 
      ...state, 
      isHistoryExpanded: !state.isHistoryExpanded 
    })),
    // New method to open with context
    openWithContext: (context) => update(state => ({ 
      ...state, 
      isOpen: true, 
      pendingContext: context 
    })),
    clearPendingContext: () => update(state => ({ 
      ...state, 
      pendingContext: null 
    }))
  };
}

export const chatPanel = createChatPanelStore();
```

#### Step 1.2: Create Right Chat Panel Component
**File**: `src/lib/components/RightChatPanel.svelte`
```svelte
<script>
  import { fly, fade } from 'svelte/transition';
  import { chatPanel } from '$lib/stores/chatPanel.js';
  import { chatStore, currentContext } from '$lib/stores/chat.js';
  import { trackerStore } from '$lib/stores/tracker.js';
  import ChatMessage from './ChatMessage.svelte';
  import ChatInput from './ChatInput.svelte';
  import QuickPrompts from './QuickPrompts.svelte';
  import { onMount } from 'svelte';
  
  export let userId;
  
  let messagesContainer;
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  let showQuickPrompts = true;
  
  // Reactive statements
  $: messages = $chatStore.messages;
  $: isStreaming = $chatStore.streaming;
  $: currentSession = $chatStore.currentSession;
  $: sessions = $chatStore.sessions;
  
  // Handle resize
  function startResize(e) {
    isResizing = true;
    startX = e.clientX;
    startWidth = $chatPanel.width;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResize);
  }
  
  function handleMouseMove(e) {
    if (!isResizing) return;
    const diff = startX - e.clientX;
    const newWidth = Math.max(300, Math.min(600, startWidth + diff));
    chatPanel.setWidth(newWidth);
  }
  
  function stopResize() {
    isResizing = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResize);
  }
  
  // Auto-scroll to bottom
  $: if (messages && messagesContainer) {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  // Handle pending context from other components
  $: if ($chatPanel.pendingContext && $chatPanel.isOpen && userId) {
    handlePendingContext($chatPanel.pendingContext);
  }
  
  async function handlePendingContext(context) {
    // Clear any existing session to start fresh with new context
    await chatStore.createSession(userId, context.type, context);
    chatPanel.clearPendingContext();
    
    // Auto-send the prompt if provided
    if (context.prompt) {
      setTimeout(() => {
        chatStore.sendMessage(context.prompt, userId);
      }, 100);
    }
  }
  
  onMount(async () => {
    if (userId) {
      // Initialize tracker for this user
      await trackerStore.init(userId);
      
      // Initialize chat context with tracker data
      chatStore.initContext(userId, null);
      
      // Load chat sessions
      await chatStore.loadSessions(userId);
      
      // Check for context from localStorage (backwards compatibility)
      const savedContext = localStorage.getItem('learningos_ai_context');
      if (savedContext && !$chatPanel.pendingContext) {
        try {
          const context = JSON.parse(savedContext);
          localStorage.removeItem('learningos_ai_context');
          // If panel is already open, handle immediately
          if ($chatPanel.isOpen) {
            handlePendingContext(context);
          } else {
            // Otherwise, open with context
            chatPanel.openWithContext(context);
          }
        } catch (e) {
          console.error('Failed to parse saved context:', e);
        }
      }
      
      // Subscribe to tracker updates
      const unsubscribe = trackerStore.subscribe(state => {
        if (userId && state) {
          const trackerData = {
            mood: state.mood,
            energyLevel: state.energyLevel,
            learningMinutes: state.learningMinutes,
            focusSessions: state.focusSessions,
            todaysGoals: state.todaysGoals,
            completedGoals: state.completedGoals,
            keyLearning: state.keyLearning,
            reflection: state.reflection,
            streakInfo: state.streakInfo,
            todaysLog: state.todaysLog
          };
          chatStore.updateLearningState(trackerData);
        }
      });
      
      return () => unsubscribe();
    }
  });
  
  function handleNewChat() {
    chatStore.clearChat();
    showQuickPrompts = true;
  }
  
  async function handleSelectSession(event) {
    const sessionId = event.detail;
    await chatStore.loadSession(sessionId);
    showQuickPrompts = false;
  }
  
  function handlePromptSelect(event) {
    // Will be handled by ChatInput
    showQuickPrompts = false;
  }
  
  // Context info for display
  $: contextInfo = {
    mood: $trackerStore?.mood,
    energy: $trackerStore?.energyLevel,
    goals: `${$trackerStore?.completedGoals?.length || 0}/${$trackerStore?.todaysGoals?.length || 0}`,
    learningTime: `${$trackerStore?.learningMinutes || 0}m`,
    streak: $trackerStore?.streakInfo?.current || 0
  };
</script>

<!-- Backdrop for mobile -->
{#if $chatPanel.isOpen}
  <div 
    class="lg:hidden fixed inset-0 bg-black/20 z-40"
    on:click={() => chatPanel.close()}
    transition:fade={{ duration: 200 }}
  />
{/if}

<!-- Chat Panel -->
<aside
  class="fixed right-0 top-0 h-full z-50 flex"
  style="width: {$chatPanel.width}px; transform: translateX({$chatPanel.isOpen ? 0 : $chatPanel.width}px)"
  transition:fly={{ x: $chatPanel.width, duration: 300 }}
>
  <!-- Resize Handle -->
  <div
    class="absolute left-0 top-0 w-1 h-full cursor-ew-resize hover:bg-blue-500/20 group"
    on:mousedown={startResize}
  >
    <div class="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-8 -translate-x-1/2 
                flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
      <div class="w-0.5 h-full bg-gray-400 rounded-full"></div>
    </div>
  </div>
  
  <!-- Panel Content -->
  <div class="flex-1 bg-white border-l border-gray-200 shadow-xl flex flex-col">
    <!-- Header -->
    <header class="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-gray-50">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 
                    flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        </div>
        <div>
          <h2 class="font-semibold text-gray-800">AI Assistant</h2>
          {#if $currentContext && $currentContext.type !== 'general'}
            <p class="text-xs text-gray-500">
              {$currentContext.type === 'roadmap' ? `${$currentContext.roadmap}` : 
               $currentContext.type === 'feeds' ? 'Reading Feeds' : 
               'Learning Mode'}
            </p>
          {/if}
        </div>
      </div>
      
      <div class="flex items-center gap-2">
        <!-- Context Indicator -->
        {#if contextInfo.streak > 0}
          <div class="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-lg text-xs">
            <span>🔥</span>
            <span>{contextInfo.streak}d</span>
          </div>
        {/if}
        
        <!-- History Toggle -->
        <button
          on:click={() => chatPanel.toggleHistory()}
          class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="Chat history"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </button>
        
        <!-- New Chat -->
        <button
          on:click={handleNewChat}
          class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          title="New chat"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
        
        <!-- Close Button -->
        <button
          on:click={() => chatPanel.close()}
          class="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    </header>
    
    <!-- Chat History (Collapsible) -->
    {#if $chatPanel.isHistoryExpanded}
      <div class="border-b border-gray-200 bg-gray-50 max-h-48 overflow-y-auto" 
           transition:fly={{ y: -10, duration: 200 }}>
        <div class="p-2 space-y-1">
          {#if sessions.length === 0}
            <p class="text-center text-gray-500 text-sm py-4">No chat history</p>
          {:else}
            {#each sessions as session}
              <button
                on:click={() => chatStore.loadSession(session.id)}
                class="w-full text-left px-3 py-2 rounded-lg text-sm
                       hover:bg-white hover:shadow-sm transition-all
                       {currentSession?.id === session.id ? 'bg-white shadow-sm' : ''}"
              >
                <div class="font-medium text-gray-700 truncate">
                  {session.title || `${session.context_type} chat`}
                </div>
                <div class="text-xs text-gray-500 flex items-center gap-2">
                  <span>{new Date(session.created_at).toLocaleDateString()}</span>
                  {#if session.context_type === 'roadmap'}
                    <span class="text-purple-600">🎯</span>
                  {:else if session.context_type === 'feeds'}
                    <span class="text-blue-600">📰</span>
                  {/if}
                </div>
              </button>
            {/each}
          {/if}
        </div>
      </div>
    {/if}
    
    <!-- Messages Area -->
    <div 
      bind:this={messagesContainer}
      class="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {#if messages.length === 0}
        <div class="flex flex-col items-center justify-center h-full text-gray-500">
          <svg class="w-16 h-16 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
          </svg>
          <p class="text-sm">Start a conversation</p>
          <p class="text-xs mt-1">Ask me anything about your learning journey</p>
          
          <!-- Show quick prompts if available -->
          {#if showQuickPrompts}
            <div class="mt-6 w-full max-w-md">
              <QuickPrompts 
                on:selectPrompt={handlePromptSelect}
                contextType={$currentContext?.type || 'general'}
              />
            </div>
          {/if}
        </div>
      {:else}
        {#each messages as message}
          <ChatMessage {message} streaming={isStreaming && message === messages[messages.length - 1]} />
        {/each}
      {/if}
    </div>
    
    <!-- Input Area -->
    <ChatInput {userId} on:promptSelect={handlePromptSelect} />
  </div>
</aside>

<style>
  aside {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
</style>
```

### Phase 2: Update Navigation and Context Flow

#### Step 2.1: Update Navigation Store
**File**: `src/lib/stores/navigation.js`
```javascript
import { writable } from 'svelte/store';
import { chatPanel } from './chatPanel.js';

function createNavigationStore() {
  const { subscribe, set, update } = writable({
    currentTab: 'feeds'
  });

  return {
    subscribe,
    
    setTab(tabId) {
      update(state => ({ ...state, currentTab: tabId }));
    },
    
    // Updated to open chat panel instead of navigating to chat tab
    navigateToChat() {
      chatPanel.open();
    }
  };
}

export const navigation = createNavigationStore();
```

#### Step 2.3: Update App.svelte
```svelte
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
      userId = urlUserId;
      localStorage.setItem('learningos_user_id', userId);
    } else {
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
  <!-- Left Sidebar Navigation (unchanged) -->
  <aside class="w-64 min-h-screen flex flex-col" 
         style="background: linear-gradient(180deg, #14B8A6, #0F766E); border-right: 1px solid rgba(255,255,255,0.1);">
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
                     ? 'background: rgba(255,255,255,0.2); backdrop-filter: blur(10px);' 
                     : ''}"
          >
            <span class="text-2xl">{item.emoji}</span>
            <span class="font-medium">{item.name}</span>
          </button>
        {/each}
      </div>
    </nav>
    
    <!-- Bottom Section with Chat Trigger -->
    <div class="p-4 border-t" style="border-color: rgba(255,255,255,0.1);">
      <button
        on:click={() => chatPanel.toggle()}
        class="w-full flex items-center justify-between px-4 py-3 rounded-lg
               text-white/80 hover:text-white hover:bg-white/10 transition-all"
      >
        <div class="flex items-center space-x-3">
          <span class="text-xl">💬</span>
          <span class="font-medium">AI Assistant</span>
        </div>
        <span class="text-xs opacity-60">⌘/</span>
      </button>
      
      <div class="mt-4 text-xs text-center text-white/50">
        ID: {userId.slice(0, 8)}
      </div>
    </div>
  </aside>
  
  <!-- Main Content Area -->
  <div class="flex-1 relative">
    <!-- Chat Toggle Button (Floating) - Only show when panel is closed -->
    {#if !$chatPanel.isOpen}
      <button
        on:click={() => chatPanel.open()}
        class="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg
               bg-gradient-to-br from-blue-500 to-purple-600 text-white
               flex items-center justify-center hover:shadow-xl transform
               hover:scale-105 transition-all z-30"
        title="AI Assistant (⌘/)"
        transition:fade={{ duration: 200 }}
      >
        <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      </button>
    {/if}
    
    <!-- Page Content -->
    <main class="h-full transition-all duration-300"
          style="margin-right: {$chatPanel.isOpen ? $chatPanel.width + 'px' : '0'}">
      <div class="p-6">
        {#if currentComponent}
          <svelte:component this={currentComponent} {userId} />
        {/if}
      </div>
    </main>
  </div>
  
  <!-- Right Chat Panel -->
  <RightChatPanel {userId} />
</div>
```
**File**: `src/pages/Roadmap.svelte` (partial update)
```javascript
// Import the chat panel store
import { chatPanel } from '../lib/stores/chatPanel.js';

// Update the askAI function
function askAI() {
  const currentRoadmap = $roadmapStore.selectedRoadmap;
  if (!currentRoadmap) return;
  
  const progress = $currentProgress;
  let currentStageIndex = 0;
  let currentStage = currentRoadmap.stages[0];
  
  if (progress?.stage_progress?.length > 0) {
    const incompleteIndex = progress.stage_progress.findIndex(sp => !sp.completed);
    if (incompleteIndex >= 0) {
      currentStageIndex = incompleteIndex;
      currentStage = currentRoadmap.stages[incompleteIndex];
    } else {
      currentStageIndex = currentRoadmap.stages.length - 1;
      currentStage = currentRoadmap.stages[currentStageIndex];
    }
  }
  
  const context = {
    type: 'roadmap',
    roadmap: currentRoadmap.name,
    stage: currentStage?.title,
    stageDescription: currentStage?.description,
    completedStages: progress?.completed_stages || 0,
    totalStages: progress?.total_stages || currentRoadmap.stages.length,
    prompt: currentStage?.practicePrompt,
    difficulty: currentRoadmap.difficulty,
    estimatedTime: currentStage?.estimatedTime
  };
  
  // Use the new chat panel method
  chatPanel.openWithContext(context);
  showToast('Opening AI Assistant...', 'success');
}

// Update the askAIForStageHelp function
function askAIForStageHelp(stageIndex, stage) {
  const currentRoadmap = $roadmapStore.selectedRoadmap;
  if (!currentRoadmap || !stage) return;
  
  const progress = $currentProgress;
  
  const context = {
    type: 'roadmap',
    roadmap: currentRoadmap.name,
    stage: stage.title,
    stageDescription: stage.description,
    completedStages: progress?.completed_stages || 0,
    totalStages: progress?.total_stages || currentRoadmap.stages.length,
    prompt: `Help me with this practice prompt: "${stage.practicePrompt}"`,
    difficulty: currentRoadmap.difficulty,
    estimatedTime: stage.estimatedTime,
    resources: stage.resources,
    learningObjectives: stage.learningObjectives
  };
  
  // Use the new chat panel method
  chatPanel.openWithContext(context);
  showToast(`Opening AI Assistant for "${stage.title}"...`, 'success');
}
```
```svelte
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
    // ... existing userId logic ...
    document.addEventListener('keydown', handleKeydown);
    return () => document.removeEventListener('keydown', handleKeydown);
  });
</script>

<div class="min-h-screen flex" style="background-color: var(--color-zen-50);">
  <!-- Left Sidebar Navigation (unchanged) -->
  <aside class="w-64 min-h-screen flex flex-col" 
         style="background: linear-gradient(180deg, #14B8A6, #0F766E);">
    <!-- ... existing sidebar content ... -->
  </aside>
  
  <!-- Main Content Area -->
  <div class="flex-1 relative">
    <!-- Chat Toggle Button (Floating) -->
    <button
      on:click={() => chatPanel.toggle()}
      class="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg
             bg-gradient-to-br from-blue-500 to-purple-600 text-white
             flex items-center justify-center hover:shadow-xl transform
             hover:scale-105 transition-all z-30
             {$chatPanel.isOpen ? 'opacity-0 pointer-events-none' : ''}"
      title="AI Assistant (⌘/)"
    >
      <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
      </svg>
    </button>
    
    <!-- Page Content -->
    <main class="h-full transition-all duration-300"
          style="margin-right: {$chatPanel.isOpen ? $chatPanel.width + 'px' : '0'}">
      <div class="p-6">
        {#if currentComponent}
          <svelte:component this={currentComponent} {userId} />
        {/if}
      </div>
    </main>
  </div>
  
  <!-- Right Chat Panel -->
  <RightChatPanel {userId} />
</div>
```

### Phase 3: Create Simplified Chat Components

#### Step 3.1: Create ChatInput Component
**File**: `src/lib/components/ChatInput.svelte`
```svelte
<script>
  import { chatStore } from '$lib/stores/chat.js';
  import { createEventDispatcher } from 'svelte';
  
  export let userId;
  
  let inputValue = '';
  let inputElement;
  const dispatch = createEventDispatcher();
  
  async function sendMessage() {
    if (!inputValue.trim() || $chatStore.streaming) return;
    
    const message = inputValue.trim();
    inputValue = '';
    
    await chatStore.sendMessage(message, userId);
  }
  
  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }
  
  // Handle quick prompt selection from parent
  export function setPrompt(prompt) {
    inputValue = prompt;
    inputElement?.focus();
  }
</script>

<div class="border-t border-gray-200 p-4 bg-gray-50">
  <!-- Context indicator -->
  {#if $chatStore.currentSession?.context_type !== 'general'}
    <div class="mb-2 text-xs text-gray-500 flex items-center gap-2">
      <span>Context:</span>
      <span class="px-2 py-0.5 bg-white rounded-full border border-gray-200">
        {$chatStore.currentSession?.context_type}
      </span>
    </div>
  {/if}
  
  <div class="flex gap-2">
    <textarea
      bind:this={inputElement}
      bind:value={inputValue}
      on:keydown={handleKeydown}
      placeholder="Ask me anything..."
      disabled={$chatStore.streaming}
      class="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2
             focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
             disabled:opacity-50 disabled:cursor-not-allowed
             placeholder-gray-400 text-sm"
      rows="2"
    />
    <button
      on:click={sendMessage}
      disabled={!inputValue.trim() || $chatStore.streaming}
      class="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white
             rounded-lg hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed
             transition-all duration-200 flex items-center justify-center"
    >
      {#if $chatStore.streaming}
        <svg class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
        </svg>
      {:else}
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" 
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
        </svg>
      {/if}
    </button>
  </div>
</div>
```

#### Step 3.2: Keep Existing Components
The following components can be reused without modification:
- `ChatMessage.svelte` - Already handles message display well
- `ChatSidebar.svelte` - Can be simplified for the embedded history
- `QuickPrompts.svelte` - Works as-is for prompt suggestions

### Phase 4: Update Component Integration

#### Step 4.1: Add Chat Context to Feeds Component
**File**: `src/pages/Feeds.svelte` (partial update)
```javascript
import { chatPanel } from '../lib/stores/chatPanel.js';

function askAboutArticle(article) {
  const context = {
    type: 'feeds',
    article: article.title,
    url: article.link,
    description: article.description,
    prompt: `Can you help me understand this article: "${article.title}"?`
  };
  
  chatPanel.openWithContext(context);
}
```

In the article card template:
```svelte
<button
  on:click={() => askAboutArticle(article)}
  class="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-2"
>
  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
  </svg>
  Ask AI
</button>
```

#### Step 4.2: Tracker Integration
The Tracker component already passes context through the chat store, so it will work automatically with the sidebar panel. The tracker context (mood, energy, goals) is always available to the AI.

### Phase 5: Maintain Existing Functionality

#### Key Functionality to Preserve:

1. **Context Provider Integration**
   - Keep the existing `ContextProvider` class unchanged
   - Continue using `chatStore.initContext()` and `updateLearningState()`
   - Tracker context is automatically passed to every chat session

2. **Chat Store Methods**
   - All existing methods remain the same
   - `loadSessions()`, `sendMessage()`, `createSession()` work as before
   - Streaming responses continue to work

3. **Navigation Flow**
   - Update `navigation.navigateToChat()` to open the panel instead
   - Context passing through `chatPanel.openWithContext()` replaces localStorage method
   - Auto-send prompts when context includes them

4. **Session Management**
   - Chat history is embedded in the panel header
   - Sessions show context type with icons
   - Delete functionality preserved in the history dropdown

### Phase 6: Testing & Edge Cases

#### Key Testing Points:
1. **Context Flow**
   - ✅ Roadmap "Ask AI" opens panel with correct context
   - ✅ Tracker context is always available
   - ✅ Feeds "Ask AI" passes article context
   - ✅ General chat works without specific context

2. **Panel Behavior**
   - ✅ Keyboard shortcut (⌘/) toggles panel
   - ✅ Resize functionality works smoothly
   - ✅ Mobile overlay behavior
   - ✅ Content adjusts when panel opens/closes

3. **Session Persistence**
   - ✅ Chat history loads correctly
   - ✅ Switching sessions maintains context
   - ✅ New chat clears previous context
   - ✅ Sessions save with correct metadata

## Migration Checklist

### Pre-Migration Backup
- [ ] Backup current Chat.svelte component
- [ ] Document any custom modifications
- [ ] Note existing API endpoints

### Implementation Steps
- [ ] Create `chatPanel.js` store
- [ ] Create `RightChatPanel.svelte` component
- [ ] Update `ChatInput.svelte` with context indicator
- [ ] Update `navigation.js` store
- [ ] Modify `App.svelte` structure
- [ ] Update Roadmap component context passing
- [ ] Update Feeds component with AI triggers
- [ ] Remove Chat tab from navigation
- [ ] Add floating chat button
- [ ] Add keyboard shortcut handler

### Functionality Verification
- [ ] Tracker context passes automatically
- [ ] Roadmap context opens chat with prompt
- [ ] Feeds context includes article info
- [ ] Chat history displays correctly
- [ ] Sessions maintain context type
- [ ] Streaming responses work
- [ ] Quick prompts appear appropriately
- [ ] Export functionality preserved
- [ ] Mobile responsive behavior

### Visual Polish
- [ ] Smooth panel animations
- [ ] Resize handle visibility
- [ ] Context indicators in header
- [ ] Session type icons
- [ ] Loading states
- [ ] Empty states with quick prompts
- [ ] Floating button transition

### Edge Cases
- [ ] Panel state persists across page reloads
- [ ] ESC key closes panel
- [ ] Click outside closes on mobile
- [ ] Focus management when opening
- [ ] Scroll position preservation
- [ ] Error handling for failed context

## Post-Implementation Enhancements

1. **Panel Memory**
   - Save panel width preference
   - Remember open/closed state
   - Preserve history expansion

2. **Enhanced Context**
   - Show breadcrumbs for current context
   - Quick context switcher
   - Visual context indicators

3. **Keyboard Navigation**
   - Up/down arrows for history
   - Tab through quick prompts
   - Enter to send from anywhere

4. **Advanced Features**
   - Detachable panel for dual-screen
   - Voice input integration
   - Code snippet handling
   - File attachment support

### Important Notes on Existing Components

1. **Chat Sidebar Removal**: The existing dark purple sidebar in Chat.svelte will be replaced by the embedded history in the panel header. This simplifies the UI and reduces visual complexity.

2. **Context Provider**: Keep all existing context provider logic - it works perfectly with the new sidebar approach.

3. **Chat Store**: No changes needed to the chat store - all methods continue to work as before.

4. **Backwards Compatibility**: The implementation checks for localStorage context to support any delayed navigation from other components.

## Gradual Migration Option

If you want to test the new sidebar while keeping the existing chat tab:

1. **Keep both implementations temporarily**:
   ```javascript
   // In navigationItems, keep Chat for now
   const navigationItems = [
     { name: 'Feeds', id: 'feeds', emoji: '📰', component: Feeds },
     { name: 'Roadmap', id: 'roadmap', emoji: '🎯', component: Roadmap },
     { name: 'Chat', id: 'chat', emoji: '💬', component: Chat }, // Keep temporarily
     { name: 'Tracker', id: 'tracker', emoji: '✅', component: Tracker }
   ];
   ```

2. **Add a feature flag**:
   ```javascript
   // In App.svelte
   const USE_CHAT_SIDEBAR = true; // Toggle this for testing
   
   // In navigation.js
   navigateToChat() {
     if (USE_CHAT_SIDEBAR) {
       chatPanel.open();
     } else {
       update(state => ({ ...state, currentTab: 'chat' }));
     }
   }
   ```

3. **Test thoroughly** before removing the Chat tab completely

## Summary

This implementation preserves all existing chat functionality while modernizing the UX:

✅ **All Context Preserved**: Tracker, Roadmap, and Feeds contexts work exactly as before  
✅ **Improved Accessibility**: Chat available from anywhere without losing current work  
✅ **Modern Interface**: Sliding panel matches contemporary AI tools  
✅ **Minimal Code Changes**: Most existing code remains unchanged  
✅ **Enhanced Workflow**: No more context switching between tabs  

The key insight is that by intercepting the navigation flow and using a panel store, we can maintain all existing functionality while providing a much better user experience. The chat becomes a true assistant that's always available but never in the way.