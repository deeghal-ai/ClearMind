<script>
  import { onMount, afterUpdate } from 'svelte';
  import { chatStore, currentContext } from '../lib/stores/chat.js';
  import { user } from '../lib/stores/user.js';
  import { trackerStore } from '../lib/stores/tracker.js';
  import ChatMessage from '../lib/components/ChatMessage.svelte';
  import ChatSidebar from '../lib/components/ChatSidebar.svelte';
  import QuickPrompts from '../lib/components/QuickPrompts.svelte';
  
  let userId = '';
  let inputValue = '';
  let messagesContainer;
  let showSidebar = true;
  let inputTextarea;
  
  onMount(async () => {
    // Initialize user
    user.init();
    const unsubscribeUser = user.subscribe(async u => {
      userId = u.id;
      if (u.id) {
        // Initialize tracker for this user
        await trackerStore.init(u.id);
        
        // Initialize chat context with tracker data
        chatStore.initContext(u.id, null); // Will be updated when tracker loads
        
        // Load chat sessions
        chatStore.loadSessions(u.id);
      }
    });

    // Subscribe to tracker updates to keep AI context current
    const unsubscribeTracker = trackerStore.subscribe(state => {
      if (userId && state) {
        // Pass comprehensive tracker data to chat context
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
    
    // Check for context from other tabs
    const savedContext = localStorage.getItem('learningos_ai_context');
    if (savedContext) {
      try {
        const context = JSON.parse(savedContext);
        await chatStore.createSession(userId, context.type, context);
        localStorage.removeItem('learningos_ai_context');
        
        // Pre-fill the input with the prompt but don't auto-send
        if (context.prompt) {
          inputValue = context.prompt;
          setTimeout(() => {
            inputTextarea?.focus();
            inputTextarea?.select();
          }, 500);
        }
      } catch (error) {
        console.error('Error parsing context:', error);
      }
    }
    
    return () => {
      unsubscribeUser();
      unsubscribeTracker();
    };
  });
  
  // Auto-scroll to bottom when new messages arrive
  afterUpdate(() => {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });
  
  async function sendMessage() {
    console.log('🔍 DEBUG Chat.svelte: sendMessage called');
    console.log('🔍 DEBUG Chat.svelte: inputValue =', inputValue);
    console.log('🔍 DEBUG Chat.svelte: streaming =', $chatStore.streaming);
    console.log('🔍 DEBUG Chat.svelte: userId =', userId);
    
    if (!inputValue.trim() || $chatStore.streaming) {
      console.log('🚨 DEBUG Chat.svelte: Message blocked - empty input or streaming');
      return;
    }
    
    const message = inputValue;
    inputValue = '';
    
    console.log('🎯 DEBUG Chat.svelte: About to call chatStore.sendMessage with:', message);
    
    try {
      await chatStore.sendMessage(message, userId);
      console.log('✅ DEBUG Chat.svelte: sendMessage completed');
    } catch (error) {
      console.error('🚨 DEBUG Chat.svelte: Error in sendMessage:', error);
    }
    
    // Focus back on input
    inputTextarea?.focus();
  }
  
  async function handleNewChat() {
    chatStore.clearChat();
  }
  
  async function handleSelectSession(event) {
    const sessionId = event.detail;
    await chatStore.loadSession(sessionId);
  }
  
  function handleKeypress(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }
  
  function handlePromptSelect(event) {
    inputValue = event.detail.prompt;
    inputTextarea?.focus();
  }
  
  // Mobile responsive
  function toggleSidebar() {
    showSidebar = !showSidebar;
  }

  // Context info for debugging/visibility
  $: contextInfo = {
    mood: $trackerStore?.mood,
    energy: $trackerStore?.energyLevel,
    goals: `${$trackerStore?.completedGoals?.length || 0}/${$trackerStore?.todaysGoals?.length || 0}`,
    learningTime: `${$trackerStore?.learningMinutes || 0}m`,
    streak: $trackerStore?.streakInfo?.current || 0
  };
</script>

<div class="flex h-[calc(100vh-8rem)]">
  <!-- Dark Contrasted Sidebar -->
  <div class="w-64 hidden lg:block flex-shrink-0 border-r border-gray-200" style="background: linear-gradient(180deg, #1e1b4b, #312e81); box-shadow: 4px 0 20px rgba(30, 27, 75, 0.15);">
    <ChatSidebar
      sessions={$chatStore.sessions}
      currentSessionId={$chatStore.currentSession?.id}
      {userId}
      on:newChat={handleNewChat}
      on:selectSession={handleSelectSession}
    />
  </div>
  
  <!-- Mobile Dark Contrasted Sidebar -->
  {#if showSidebar}
    <div class="fixed inset-0 z-40 lg:hidden">
      <button class="absolute inset-0 bg-black opacity-50" on:click={toggleSidebar} aria-label="Close sidebar"></button>
      <div class="absolute left-0 top-0 w-64 h-full border-r border-gray-200" style="background: linear-gradient(180deg, #1e1b4b, #312e81); box-shadow: 4px 0 20px rgba(30, 27, 75, 0.15);">
        <ChatSidebar
          sessions={$chatStore.sessions}
          currentSessionId={$chatStore.currentSession?.id}
          {userId}
          on:newChat={() => {
            handleNewChat();
            toggleSidebar();
          }}
          on:selectSession={(e) => {
            handleSelectSession(e);
            toggleSidebar();
          }}
        />
      </div>
    </div>
  {/if}
  
  <!-- Main Chat Area -->
  <div class="flex-1 flex flex-col">
    <!-- Contrasted Header with Clear Separation -->
    <div class="px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
      <div class="relative z-10 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button
            on:click={toggleSidebar}
            class="lg:hidden p-2 rounded-lg transition-all text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          
          <div class="flex items-center gap-3">
            <!-- Premium Purple AI Icon -->
            <div class="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
              <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <h1 class="text-xl font-bold text-gray-900">AI Learning Assistant</h1>
              {#if $currentContext.type}
                <p class="text-sm text-gray-600">
                  Context: {$currentContext.type === 'roadmap' ? `${$currentContext.roadmap} - ${$currentContext.stage || 'General'}` :
                           $currentContext.type === 'feeds' ? 'Recent articles' :
                           'General learning'}
                </p>
              {/if}
            </div>
          </div>
        </div>
        
        {#if $chatStore.error}
          <div class="px-3 py-2 rounded-lg text-sm bg-red-50 text-red-700 border border-red-200">
            {$chatStore.error}
            <button
              on:click={() => chatStore.clearError()}
              class="ml-2 transition-colors text-red-500 hover:text-red-700"
            >
              ✕
            </button>
          </div>
        {/if}
      </div>
    </div>
    
    <!-- Clean White Messages Area -->
    <div 
      bind:this={messagesContainer}
      class="flex-1 overflow-y-auto bg-white"
    >
      {#if $chatStore.messages.length === 0}
        <!-- Clean Dashboard Empty State -->
        <div class="p-8 text-center">
          {#if $currentContext.type === 'roadmap'}
            <div class="mb-6 p-4 rounded-xl bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg max-w-md mx-auto">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clip-rule="evenodd" />
                  </svg>
                </div>
                <div class="text-left">
                  <p class="font-medium">Learning: {$currentContext.roadmap}</p>
                  {#if $currentContext.stage}
                    <p class="text-sm text-white/80">Current stage: {$currentContext.stage}</p>
                  {/if}
                </div>
              </div>
            </div>
          {/if}
          
          <!-- Dashboard Welcome -->
          <div class="w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6 bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
            <svg class="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <h3 class="text-2xl font-bold text-gray-900 mb-2">Start a conversation</h3>
          <p class="text-gray-600 text-lg">Ask me anything about your learning journey</p>
        </div>
      {:else}
        <div class="p-4 space-y-4">
          {#each $chatStore.messages as message, i}
            <ChatMessage 
              {message} 
              streaming={$chatStore.streaming && i === $chatStore.messages.length - 1}
            />
          {/each}
        </div>
      {/if}
    </div>
    
    <!-- Quick Prompts -->
    {#if $chatStore.messages.length === 0}
      <QuickPrompts 
        context={$currentContext}
        on:selectPrompt={handlePromptSelect}
      />
    {/if}
    
    <!-- Compact & Sleek AI Context -->
    {#if contextInfo.mood || contextInfo.energy || contextInfo.goals !== '0/0'}
      <div class="px-4 py-2 bg-white border-t border-gray-100">
        <div class="flex items-center justify-between">
          <!-- Compact Header -->
          <div class="flex items-center gap-2">
            <div class="w-6 h-6 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600">
              <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span class="text-sm font-medium text-gray-700">Context</span>
          </div>
          
          <!-- Dense Badge Row -->
          <div class="flex items-center gap-1.5">
            {#if contextInfo.mood}
              <div class="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 border border-gray-200">
                <div class="w-2 h-2 rounded-full {contextInfo.mood === 'amazing' ? 'bg-green-500' : contextInfo.mood === 'good' ? 'bg-green-400' : contextInfo.mood === 'okay' ? 'bg-yellow-400' : 'bg-orange-400'}"></div>
                <span class="text-xs font-medium text-gray-700 capitalize">{contextInfo.mood}</span>
              </div>
            {/if}
            
            {#if contextInfo.energy}
              <div class="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 border border-gray-200">
                <svg class="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
                </svg>
                <span class="text-xs font-medium text-gray-700">{contextInfo.energy}/5</span>
              </div>
            {/if}
            
            {#if contextInfo.goals !== '0/0'}
              <div class="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 border border-gray-200">
                <svg class="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clip-rule="evenodd" />
                </svg>
                <span class="text-xs font-medium text-gray-700">{contextInfo.goals}</span>
              </div>
            {/if}
            
            {#if contextInfo.learningTime !== '0m'}
              <div class="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 border border-gray-200">
                <svg class="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clip-rule="evenodd" />
                </svg>
                <span class="text-xs font-medium text-gray-700">{contextInfo.learningTime}</span>
              </div>
            {/if}
            
            {#if contextInfo.streak > 0}
              <div class="flex items-center gap-1 px-2 py-1 rounded-md bg-gray-50 border border-gray-200">
                <svg class="w-3 h-3 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clip-rule="evenodd" />
                </svg>
                <span class="text-xs font-medium text-gray-700">{contextInfo.streak}d</span>
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- Clean Dashboard Input Area -->
    <div class="px-6 py-4 bg-white border-t border-gray-200 shadow-lg">
      
      <div class="relative z-10">
        <form on:submit|preventDefault={(e) => {
          console.log('🔍 DEBUG Chat.svelte: Form submitted');
          sendMessage();
        }} class="flex gap-3">
          <div class="flex-1 relative">
            <textarea
              bind:this={inputTextarea}
              bind:value={inputValue}
              on:keydown={handleKeypress}
              placeholder="Ask me anything..."
              rows="1"
              disabled={$chatStore.streaming}
              class="w-full px-4 py-3 rounded-xl resize-none transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-gray-50 border border-gray-200 text-gray-900 placeholder-gray-500 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              style="min-height: 48px; max-height: 200px;"
            />
          </div>
          
          <button
            type="submit"
            disabled={!inputValue.trim() || $chatStore.streaming}
            on:click={() => {
              console.log('🔍 DEBUG Chat.svelte: Send button clicked');
              console.log('🔍 DEBUG Chat.svelte: Button disabled?', !inputValue.trim() || $chatStore.streaming);
            }}
            class="px-6 py-3 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:from-purple-500 hover:to-purple-600 hover:scale-105 shadow-lg hover:shadow-xl text-sm"
          >
            {#if $chatStore.streaming}
              <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Wait...</span>
            {:else}
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              <span>Send</span>
            {/if}
          </button>
        </form>
        
        <div class="mt-3 flex items-center justify-between text-xs text-gray-500">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1">
              <kbd class="px-2 py-1 rounded bg-gray-100 text-gray-600 border border-gray-200 font-mono">⌘</kbd>
              <span>+</span>
              <kbd class="px-2 py-1 rounded bg-gray-100 text-gray-600 border border-gray-200 font-mono">↵</kbd>
              <span>to send</span>
            </span>
            <span class="flex items-center gap-1">
              <kbd class="px-2 py-1 rounded bg-gray-100 text-gray-600 border border-gray-200 font-mono">⇧</kbd>
              <span>+</span>
              <kbd class="px-2 py-1 rounded bg-gray-100 text-gray-600 border border-gray-200 font-mono">↵</kbd>
              <span>for new line</span>
            </span>
          </div>
          {#if $chatStore.currentSession}
            <div class="flex items-center gap-2">
              <div class="w-2 h-2 rounded-full bg-green-400"></div>
              <span class="font-medium">{$chatStore.messages.length} messages</span>
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Auto-resize textarea */
  textarea {
    field-sizing: content;
  }
  
  /* Fallback for browsers that don't support field-sizing */
  @supports not (field-sizing: content) {
    textarea {
      overflow-y: hidden;
    }
  }
</style>