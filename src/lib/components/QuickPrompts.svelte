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

<!-- Colorful Dashboard Quick Prompts -->
<div class="p-6 bg-gray-50">
  <div class="flex items-center gap-3 mb-4">
    <div class="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-purple-500 to-purple-600 shadow-lg">
      <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    </div>
    <h3 class="text-lg font-semibold text-gray-900">Quick Prompts</h3>
  </div>
  
  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    {#each displayPrompts as prompt, index}
      <button
        on:click={() => usePrompt(prompt)}
        class="text-left p-4 rounded-xl transition-all duration-200 group hover:scale-105 hover:-translate-y-1 shadow-lg"
        style="background: {index % 4 === 0 ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 
                           index % 4 === 1 ? 'linear-gradient(135deg, #ec4899, #f43f5e)' : 
                           index % 4 === 2 ? 'linear-gradient(135deg, #10b981, #059669)' :
                           'linear-gradient(135deg, #f59e0b, #d97706)'};"
      >
        <p class="font-semibold text-sm mb-2 text-white">
          {prompt.title}
        </p>
        <p class="text-sm leading-relaxed text-white/90">
          {prompt.prompt}
        </p>
      </button>
    {/each}
  </div>
  
  {#if prompts.length > 3}
    <button
      on:click={() => showAll = !showAll}
      class="mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:shadow-md"
    >
      {showAll ? '▲ Show Less' : `▼ Show ${prompts.length - 3} More`}
    </button>
  {/if}
</div>