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
  <!-- Sidebar -->
  <div class="w-64 hidden lg:block flex-shrink-0">
    <ChatSidebar
      sessions={$chatStore.sessions}
      currentSessionId={$chatStore.currentSession?.id}
      {userId}
      on:newChat={handleNewChat}
      on:selectSession={handleSelectSession}
    />
  </div>
  
  <!-- Mobile sidebar -->
  {#if showSidebar}
    <div class="fixed inset-0 z-40 lg:hidden">
      <button class="absolute inset-0 bg-black opacity-50" on:click={toggleSidebar} aria-label="Close sidebar"></button>
      <div class="absolute left-0 top-0 w-64 h-full">
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
    <!-- Header -->
    <div class="bg-white border-b border-zen-gray-200 px-4 py-3 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <button
          on:click={toggleSidebar}
          class="lg:hidden p-2 hover:bg-zen-gray-100 rounded-lg"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        
        <div>
          <h1 class="text-xl font-semibold">AI Learning Assistant</h1>
          {#if $currentContext.type}
            <p class="text-sm text-zen-gray-600">
              Context: {$currentContext.type === 'roadmap' ? `${$currentContext.roadmap} - ${$currentContext.stage || 'General'}` :
                       $currentContext.type === 'feeds' ? 'Recent articles' :
                       'General learning'}
            </p>
          {/if}
        </div>
      </div>
      
      {#if $chatStore.error}
        <div class="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-sm">
          {$chatStore.error}
          <button
            on:click={() => chatStore.clearError()}
            class="ml-2 hover:text-red-900"
          >
            ✕
          </button>
        </div>
      {/if}
    </div>
    
    <!-- Messages -->
    <div 
      bind:this={messagesContainer}
      class="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {#if $chatStore.messages.length === 0}
        <div class="flex items-center justify-center h-full">
          <div class="text-center max-w-md">
            <div class="text-6xl mb-4">🤖</div>
            <h2 class="text-2xl font-semibold text-zen-gray-700 mb-2">
              How can I help you learn today?
            </h2>
            <p class="text-zen-gray-600">
              Ask me anything about AI, machine learning, or your current learning path. 
              I'm here to help you understand complex concepts and guide your journey.
            </p>
            
            {#if $currentContext.type === 'roadmap'}
              <div class="mt-6 p-4 bg-blue-50 rounded-lg text-left">
                <p class="text-sm font-medium text-blue-900 mb-1">
                  Learning: {$currentContext.roadmap}
                </p>
                {#if $currentContext.stage}
                  <p class="text-sm text-blue-700">
                    Current stage: {$currentContext.stage}
                  </p>
                {/if}
              </div>
            {/if}
          </div>
        </div>
      {:else}
        {#each $chatStore.messages as message, i}
          <ChatMessage 
            {message} 
            streaming={$chatStore.streaming && i === $chatStore.messages.length - 1}
          />
        {/each}
      {/if}
    </div>
    
    <!-- Quick Prompts -->
    {#if $chatStore.messages.length === 0}
      <QuickPrompts 
        context={$currentContext}
        on:selectPrompt={handlePromptSelect}
      />
    {/if}
    
    <!-- Context Indicator -->
    {#if contextInfo.mood || contextInfo.energy || contextInfo.goals !== '0/0'}
      <div class="border-t border-zen-gray-100 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2">
        <div class="flex items-center gap-4 text-xs">
          <span class="font-medium text-zen-gray-600">AI Context:</span>
          {#if contextInfo.mood}
            <span class="flex items-center gap-1">
              <span class="text-sm">
                {contextInfo.mood === 'amazing' ? '🤩' : 
                 contextInfo.mood === 'good' ? '😊' : 
                 contextInfo.mood === 'okay' ? '😐' : '😔'}
              </span>
              <span class="text-zen-gray-600">{contextInfo.mood}</span>
            </span>
          {/if}
          {#if contextInfo.energy}
            <span class="flex items-center gap-1">
              <span class="text-orange-600">⚡</span>
              <span class="text-zen-gray-600">{contextInfo.energy}/5</span>
            </span>
          {/if}
          {#if contextInfo.goals !== '0/0'}
            <span class="flex items-center gap-1">
              <span class="text-green-600">🎯</span>
              <span class="text-zen-gray-600">{contextInfo.goals} goals</span>
            </span>
          {/if}
          {#if contextInfo.learningTime !== '0m'}
            <span class="flex items-center gap-1">
              <span class="text-blue-600">⏱️</span>
              <span class="text-zen-gray-600">{contextInfo.learningTime}</span>
            </span>
          {/if}
          {#if contextInfo.streak > 0}
            <span class="flex items-center gap-1">
              <span class="text-red-600">🔥</span>
              <span class="text-zen-gray-600">{contextInfo.streak} days</span>
            </span>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Input Area -->
    <div class="border-t border-zen-gray-200 p-4 bg-white">
      <form on:submit|preventDefault={(e) => {
        console.log('🔍 DEBUG Chat.svelte: Form submitted');
        sendMessage();
      }} class="flex gap-3">
        <textarea
          bind:this={inputTextarea}
          bind:value={inputValue}
          on:keydown={handleKeypress}
          placeholder="Ask me anything..."
          rows="1"
          disabled={$chatStore.streaming}
          class="flex-1 px-4 py-3 border border-zen-gray-300 rounded-lg resize-none
                 focus:outline-none focus:ring-2 focus:ring-blue-500
                 disabled:opacity-50 disabled:cursor-not-allowed"
          style="min-height: 48px; max-height: 200px;"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || $chatStore.streaming}
          on:click={() => {
            console.log('🔍 DEBUG Chat.svelte: Send button clicked');
            console.log('🔍 DEBUG Chat.svelte: Button disabled?', !inputValue.trim() || $chatStore.streaming);
          }}
          class="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600
                 disabled:opacity-50 disabled:cursor-not-allowed
                 flex items-center gap-2"
        >
          {#if $chatStore.streaming}
            <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span>Thinking...</span>
          {:else}
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            <span>Send</span>
          {/if}
        </button>
      </form>
      
      <div class="mt-2 flex items-center justify-between text-xs text-zen-gray-500">
        <div class="flex items-center gap-4">
          <span>⌘/Ctrl + Enter to send</span>
          <span>Shift + Enter for new line</span>
        </div>
        {#if $chatStore.currentSession}
          <span>{$chatStore.messages.length} messages</span>
        {/if}
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