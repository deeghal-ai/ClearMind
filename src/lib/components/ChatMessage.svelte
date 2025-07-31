<script>
  import { onMount } from 'svelte';
  
  export let message;
  export let streaming = false;
  
  let marked = null;
  
  // Install marked
  onMount(async () => {
    if (!marked) {
      try {
        const markedModule = await import('marked');
        marked = markedModule.marked;
      } catch (e) {
        console.warn('Failed to load marked, using plain text');
      }
    }
  });
  
  function formatContent(content) {
    if (!content || !marked) return content;
    
    try {
      // Configure marked
      marked.setOptions({
        highlight: function(code, lang) {
          return `<pre class="language-${lang || 'text'}"><code>${escapeHtml(code)}</code></pre>`;
        },
        breaks: true,
        gfm: true
      });
      
      return marked.parse(content);
    } catch (e) {
      console.warn('Failed to parse markdown:', e);
      return content;
    }
  }
  
  function escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
  }
  
  function copyCode(code) {
    navigator.clipboard.writeText(code);
    // Show feedback
    const button = event.target;
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  }
  
  $: formattedContent = formatContent(message.content);
  $: isUser = message.role === 'user';
</script>

<div class="flex {isUser ? 'justify-end' : 'justify-start'} mb-4">
  <div class="flex items-start gap-3 max-w-[80%]">
    {#if !isUser}
      <div class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
        <span class="text-white text-sm">AI</span>
      </div>
    {/if}
    
    <div class="flex-1">
      <div 
        class="prose prose-sm max-w-none rounded-lg p-4
               {isUser 
                 ? 'bg-blue-500 text-white prose-invert' 
                 : 'bg-gray-100 text-gray-800'}"
      >
        {#if isUser}
          {message.content}
        {:else}
          {@html formattedContent}
          {#if streaming && message.content.length === 0}
            <span class="inline-block w-2 h-4 bg-current animate-pulse"></span>
          {/if}
        {/if}
      </div>
      
      {#if !isUser && !streaming && message.content}
        <div class="flex items-center gap-2 mt-2 text-xs text-gray-500">
          <button
            on:click={() => copyCode(message.content)}
            class="hover:text-gray-700 flex items-center gap-1"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
          <span>•</span>
          <span>{new Date(message.created_at).toLocaleTimeString()}</span>
        </div>
      {/if}
    </div>
    
    {#if isUser}
      <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
        <span class="text-gray-700 text-sm">U</span>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Markdown styles */
  :global(.prose pre) {
    background-color: #1f2937;
    color: #f3f4f6;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
  }
  
  :global(.prose code) {
    background-color: #e5e7eb;
    color: #1f2937;
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
  }
  
  :global(.prose-invert code) {
    background-color: #2563eb;
    color: white;
  }
  
  :global(.prose blockquote) {
    border-left: 4px solid #3b82f6;
    padding-left: 1rem;
    font-style: italic;
  }
  
  :global(.prose a) {
    color: #2563eb;
    text-decoration: underline;
  }
  
  :global(.prose a:hover) {
    color: #1d4ed8;
  }
  
  :global(.prose-invert a) {
    color: #93c5fd;
  }
  
  :global(.prose-invert a:hover) {
    color: #dbeafe;
  }
</style>