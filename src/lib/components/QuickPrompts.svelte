<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '../supabase.js';
  import { onMount } from 'svelte';
  
  export let context = {};
  
  const dispatch = createEventDispatcher();
  
  let prompts = [];
  let showAll = false;
  
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
  
  $: contextualPrompts = getContextualPrompts();
  $: displayPrompts = showAll 
    ? [...contextualPrompts, ...prompts] 
    : [...contextualPrompts, ...prompts.slice(0, 3)];
</script>

<div class="border-t border-zen-gray-200 p-4">
  <h3 class="text-sm font-medium text-zen-gray-700 mb-3">Quick Prompts</h3>
  
  <div class="space-y-2">
    {#each displayPrompts as prompt}
      <button
        on:click={() => usePrompt(prompt)}
        class="w-full text-left p-3 rounded-lg border border-zen-gray-200 
               hover:border-blue-300 hover:bg-blue-50 transition-colors group"
      >
        <p class="font-medium text-sm group-hover:text-blue-600">
          {prompt.title}
        </p>
        <p class="text-xs text-zen-gray-600 mt-1">
          {prompt.prompt}
        </p>
      </button>
    {/each}
  </div>
  
  {#if prompts.length > 3}
    <button
      on:click={() => showAll = !showAll}
      class="mt-3 text-sm text-blue-600 hover:text-blue-700"
    >
      {showAll ? 'Show less' : `Show ${prompts.length - 3} more`}
    </button>
  {/if}
</div>