<script>
  import { fly, fade } from 'svelte/transition';
  import { chatPanel } from '../stores/chatPanel.js';
  import { chatStore, currentContext } from '../stores/chat.js';
  import { trackerStore } from '../stores/tracker.js';
  import ChatMessage from './ChatMessage.svelte';
  import QuickPrompts from './QuickPrompts.svelte';
  import { onMount } from 'svelte';
  
  export let userId;
  
  let messagesContainer;
  let isResizing = false;
  let startX = 0;
  let startWidth = 0;
  let showQuickPrompts = true;
  let inputValue = '';
  let inputTextarea;
  let contextInitialized = false;
  
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
  
  // Initialize tracker context when panel opens directly (without pending context)
  $: if ($chatPanel.isOpen && !$chatPanel.pendingContext && userId && !contextInitialized) {
    initializeTrackerContext();
  }
  
  // Reset context initialization flag when panel closes
  $: if (!$chatPanel.isOpen) {
    contextInitialized = false;
  }
  
  async function initializeTrackerContext() {
    // Initialize tracker context - shared logic for both direct open and pending context
    if (userId) {
      // Initialize tracker first
      await trackerStore.init(userId);
      
      // Get current tracker state synchronously
      const currentState = $trackerStore;
      
      // Initialize context with current tracker data
      if (currentState) {
        const trackerData = {
          mood: currentState.mood,
          energyLevel: currentState.energyLevel,
          learningMinutes: currentState.learningMinutes,
          focusSessions: currentState.focusSessions,
          todaysGoals: currentState.todaysGoals,
          completedGoals: currentState.completedGoals,
          keyLearning: currentState.keyLearning,
          reflection: currentState.reflection,
          streakInfo: {
            current: currentState.streakData?.current_streak || 0,
            longest: currentState.streakData?.longest_streak || 0,
            total: currentState.streakData?.total_days || 0
          },
          todaysLog: currentState.todaysLog
        };
        
        // Debug logging
        console.log('🔍 DEBUG RightChatPanel: Tracker data being passed:', trackerData);
        console.log('🔍 DEBUG RightChatPanel: Energy level specifically:', trackerData.energyLevel);
        console.log('🔍 DEBUG RightChatPanel: Mood specifically:', trackerData.mood);
        
        // Initialize context with tracker data
        chatStore.initContext(userId, trackerData);
        chatStore.updateLearningState(trackerData);
      } else {
        // Fallback initialization
        chatStore.initContext(userId, null);
      }
      
      // Mark context as initialized
      contextInitialized = true;
    }
  }

  async function handlePendingContext(context) {
    // Ensure contextProvider is initialized with current tracker data before creating session
    if (!contextInitialized) {
      await initializeTrackerContext();
    }
    
    // Clear any existing session to start fresh with new context
    await chatStore.createSession(userId, context.type, context);
    chatPanel.clearPendingContext();
    
    // Pre-fill the input with the prompt but don't auto-send
    if (context.prompt) {
      inputValue = context.prompt;
      setTimeout(() => {
        inputTextarea?.focus();
        inputTextarea?.select();
      }, 500);
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
            streakInfo: {
              current: state.streakData?.current_streak || 0,
              longest: state.streakData?.longest_streak || 0,
              total: state.streakData?.total_days || 0
            },
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
    // Handle prompt selection
    const prompt = event.detail;
    if (prompt && prompt.prompt) {
      inputValue = prompt.prompt;
      setTimeout(() => {
        inputTextarea?.focus();
      }, 100);
    }
    showQuickPrompts = false;
  }
  
  async function sendMessage() {
    if (!inputValue.trim() || $chatStore.streaming || !userId) {
      return;
    }
    
    const message = inputValue;
    inputValue = '';
    showQuickPrompts = false;
    
    try {
      await chatStore.sendMessage(message, userId);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }
  
  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }
  
  // Context info for display
  $: contextInfo = {
    mood: $trackerStore?.mood,
    energy: $trackerStore?.energyLevel,
    goals: `${$trackerStore?.completedGoals?.length || 0}/${$trackerStore?.todaysGoals?.length || 0}`,
    learningTime: `${$trackerStore?.learningMinutes || 0}m`,
    streak: $trackerStore?.streakData?.current_streak || 0
  };
</script>

<!-- Backdrop for mobile -->
{#if $chatPanel.isOpen}
  <div 
    class="lg:hidden fixed inset-0 bg-black/20 z-40"
    on:click={() => chatPanel.close()}
    on:keydown={(e) => e.key === 'Escape' && chatPanel.close()}
    role="button"
    tabindex="0"
    aria-label="Close chat panel"
    transition:fade={{ duration: 200 }}
  />
{/if}

<!-- Chat Panel -->
<aside
  class="fixed right-0 top-0 h-full z-50 flex w-full lg:w-auto"
  style="{$chatPanel.isOpen ? '' : 'transform: translateX(100%);'} {typeof window !== 'undefined' && window.innerWidth >= 1024 ? `width: ${$chatPanel.width}px;` : 'width: 100%;'}"
  transition:fly={{ x: typeof window !== 'undefined' && window.innerWidth >= 1024 ? $chatPanel.width : window?.innerWidth || 400, duration: 300 }}
>
  <!-- Resize Handle -->
  <div
    class="absolute left-0 top-0 w-1 h-full cursor-ew-resize hover:bg-blue-500/20 group hidden lg:block"
    on:mousedown={startResize}
    role="separator"
    aria-label="Resize chat panel"
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
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 
                    flex items-center justify-center">
          <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        </div>
        <div>
          <h2 class="font-semibold text-gray-800">AI Assistant</h2>
          {#if $currentContext && $currentContext.type !== 'general'}
            <p class="text-xs text-gray-500">
              {$currentContext.type === 'roadmap' ? 
                ($currentContext.stage ? `${$currentContext.roadmap} - ${$currentContext.stage}` : $currentContext.roadmap) : 
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
                context={$currentContext || {}}
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
    <div class="border-t border-gray-200 p-4">
      <div class="flex gap-2">
        <div class="flex-1 relative">
          <textarea
            bind:this={inputTextarea}
            bind:value={inputValue}
            on:keydown={handleKeydown}
            placeholder="Ask me anything..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows="1"
            disabled={isStreaming}
          ></textarea>
        </div>
        <button
          on:click={sendMessage}
          disabled={!inputValue.trim() || isStreaming}
          class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
          </svg>
        </button>
      </div>
      
      <!-- Enhanced context info -->
      {#if contextInfo.mood || contextInfo.energy || contextInfo.goals !== '0/0' || contextInfo.streak > 0}
        <div class="mt-3 p-3 bg-gradient-to-r from-blue-50/50 to-purple-50/50 rounded-lg border border-blue-100/50">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-gray-700">Your Learning Context</span>
            <div class="flex items-center gap-1">
              <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span class="text-xs text-green-600">Live</span>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-2 text-xs">
            {#if contextInfo.mood}
              <div class="flex items-center gap-2 p-2 bg-white/60 rounded-md">
                <span class="text-purple-500">
                  {contextInfo.mood === 'amazing' ? '🤩' : 
                   contextInfo.mood === 'good' ? '😊' : 
                   contextInfo.mood === 'okay' ? '😐' : '😔'}
                </span>
                <span class="text-gray-700 font-medium capitalize">{contextInfo.mood}</span>
              </div>
            {/if}
            
            {#if contextInfo.energy}
              <div class="flex items-center gap-2 p-2 bg-white/60 rounded-md">
                <span class="text-yellow-500">⚡</span>
                <span class="text-gray-700 font-medium">{contextInfo.energy}/5</span>
              </div>
            {/if}
            
            {#if contextInfo.goals !== '0/0'}
              <div class="flex items-center gap-2 p-2 bg-white/60 rounded-md">
                <span class="text-blue-500">🎯</span>
                <span class="text-gray-700 font-medium">{contextInfo.goals}</span>
              </div>
            {/if}
            
            {#if contextInfo.learningTime !== '0m'}
              <div class="flex items-center gap-2 p-2 bg-white/60 rounded-md">
                <span class="text-green-500">📚</span>
                <span class="text-gray-700 font-medium">{contextInfo.learningTime}</span>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</aside>

<style>
  aside {
    transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
</style>