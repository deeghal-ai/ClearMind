<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '../supabase.js';
  import { onMount } from 'svelte';
  
  export let context = {};
  
  const dispatch = createEventDispatcher();
  
  let prompts = [];
  let showAll = false;
  let isCollapsed = false;
  
  onMount(async () => {
    // Load saved prompts
    try {
      const { data } = await supabase
        .from('saved_prompts')
        .select('*')
        .eq('user_id', 'default')
        .order('usage_count', { ascending: false });
      
      if (data) {
        prompts = data;
      }
    } catch (error) {
      console.warn('Could not load saved prompts:', error);
      // Fallback to default prompts
      prompts = [
        { id: '1', title: 'Explain Like I\'m 5', prompt: 'Can you explain this concept as if I were 5 years old?', category: 'learning' },
        { id: '2', title: 'Real-World Example', prompt: 'Can you provide a real-world example of how this is used?', category: 'learning' },
        { id: '3', title: 'Best Practices', prompt: 'What are the current best practices for this?', category: 'technical' },
        { id: '4', title: 'Learning Path', prompt: 'What should I learn next after mastering this?', category: 'roadmap' }
      ];
    }
  });
  
  function getContextualPrompts() {
    const contextual = [];
    
    if (context.type === 'roadmap' && context.stage) {
      contextual.push({
        title: 'Explain this stage',
        prompt: `Can you explain the "${context.stage}" stage in simple terms?`
      });
      contextual.push({
        title: 'Practice project',
        prompt: `Can you suggest a hands-on project to practice ${context.stage}?`
      });
      contextual.push({
        title: 'Common pitfalls',
        prompt: `What are common mistakes to avoid when learning ${context.stage}?`
      });
    }
    
    if (context.type === 'feeds' && context.articles?.length > 0) {
      contextual.push({
        title: 'Summarize articles',
        prompt: 'Can you summarize the key points from the articles I just read?'
      });
      contextual.push({
        title: 'Deeper dive',
        prompt: 'Can you explain the technical details behind these concepts?'
      });
    }
    
    return contextual;
  }
  
  async function usePrompt(prompt) {
    dispatch('selectPrompt', prompt);
    
    // Update usage count if it's a saved prompt
    if (prompt.id && supabase) {
      try {
        await supabase
          .from('saved_prompts')
          .update({ usage_count: (prompt.usage_count || 0) + 1 })
          .eq('id', prompt.id);
      } catch (error) {
        console.warn('Could not update usage count:', error);
      }
    }
  }

  function toggleCollapse() {
    isCollapsed = !isCollapsed;
  }
  
  $: contextualPrompts = getContextualPrompts();
  $: displayPrompts = showAll 
    ? [...contextualPrompts, ...prompts] 
    : [...contextualPrompts, ...prompts.slice(0, 3)];
</script>

<!-- Compact & Subtle Quick Prompts -->
<div class="border-t border-gray-100">
  <!-- Collapsible Header -->
  <div class="px-4 py-2 bg-white flex items-center justify-between">
    <div class="flex items-center gap-2">
      <div class="w-5 h-5 rounded-lg flex items-center justify-center bg-blue-100">
        <svg class="w-3 h-3 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h3 class="text-sm font-medium text-blue-800">Quick Prompts</h3>
      <span class="text-xs text-blue-600">({displayPrompts.length})</span>
    </div>
    
    <button
      on:click={toggleCollapse}
      class="p-1 rounded-md hover:bg-blue-50 transition-colors"
    >
      <svg class="w-4 h-4 text-blue-500 transition-transform {isCollapsed ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  </div>
  
  <!-- Collapsible Content -->
  {#if !isCollapsed}
    <div class="px-4 pb-3">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
        {#each displayPrompts as prompt, index}
          <button
            on:click={() => usePrompt(prompt)}
            class="text-left p-3 rounded-lg transition-all duration-200 hover:scale-[1.01] hover:-translate-y-0.5 border group {index % 4 === 0 ? 'bg-blue-50 border-blue-200 hover:bg-blue-100' : 
                              index % 4 === 1 ? 'bg-pink-50 border-pink-200 hover:bg-pink-100' : 
                              index % 4 === 2 ? 'bg-green-50 border-green-200 hover:bg-green-100' :
                              'bg-amber-50 border-amber-200 hover:bg-amber-100'}"
          >
            <div class="flex items-start gap-2">
              <div class="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 {index % 4 === 0 ? 'bg-blue-200 text-blue-700' : 
                              index % 4 === 1 ? 'bg-pink-200 text-pink-700' : 
                              index % 4 === 2 ? 'bg-green-200 text-green-700' :
                              'bg-amber-200 text-amber-700'}">
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div class="min-w-0 flex-1">
                <p class="font-medium text-xs mb-1 text-gray-800 leading-tight">
                  {prompt.title}
                </p>
                <p class="text-xs text-gray-600 leading-snug line-clamp-2">
                  {prompt.prompt}
                </p>
              </div>
            </div>
          </button>
        {/each}
      </div>
      
      {#if prompts.length > 3}
        <button
          on:click={() => showAll = !showAll}
          class="mt-2 px-3 py-1 rounded-full text-xs font-medium transition-all bg-blue-100 text-blue-700 hover:bg-blue-200"
        >
          {showAll ? '▲ Less' : `▼ ${prompts.length - 3} More`}
        </button>
      {/if}
    </div>
  {/if}
</div>