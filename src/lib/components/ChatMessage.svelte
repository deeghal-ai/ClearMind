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
  <div class="flex items-start gap-3 max-w-[85%]">
    {#if !isUser}
      <!-- AI Avatar -->
      <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      </div>
    {/if}
    
    <div class="flex-1">
      <div class="prose prose-sm max-w-none rounded-lg p-4 shadow-sm text-sm {isUser ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' : 'bg-gray-50 border border-gray-200 text-gray-800'}"
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
            class="flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-lg transition-all hover:bg-gray-200 hover:shadow-sm"
          >
            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
          <span class="text-gray-400">•</span>
          <span>{new Date(message.created_at).toLocaleTimeString()}</span>
        </div>
      {/if}
    </div>
    
    {#if isUser}
      <!-- User Avatar -->
      <div class="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
        <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Sage sophisticated markdown styles */
  :global(.prose pre) {
    background: linear-gradient(135deg, var(--sage-800), var(--sage-900));
    color: var(--sage-100);
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    border: 1px solid var(--sage-600);
  }
  
  :global(.prose code) {
    background: var(--sage-50);
    color: var(--sage-800);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    border: 1px solid var(--sage-300);
  }
  
  :global(.prose-invert code) {
    background-color: rgba(255, 255, 255, 0.2);
    color: white;
    border: 1px solid rgba(255, 255, 255, 0.3);
  }
  
  :global(.prose blockquote) {
    border-left: 4px solid var(--color-accent-primary);
    padding-left: 1rem;
    font-style: italic;
    background: var(--color-accent-soft);
    padding: 0.5rem 0 0.5rem 1rem;
    margin: 1rem 0;
    border-radius: 0 0.25rem 0.25rem 0;
  }
  
  :global(.prose a) {
    color: var(--color-accent-dark);
    text-decoration: underline;
    transition: color 0.2s ease;
  }
  
  :global(.prose a:hover) {
    color: var(--sage-800);
  }
  
  :global(.prose-invert a) {
    color: var(--sage-200);
  }
  
  :global(.prose-invert a:hover) {
    color: var(--sage-100);
  }

  /* Enhanced sage prose typography */
  :global(.prose h1, .prose h2, .prose h3) {
    color: var(--sage-800);
    font-weight: 600;
  }

  :global(.prose-invert h1, .prose-invert h2, .prose-invert h3) {
    color: white;
  }

  :global(.prose ul li::marker) {
    color: var(--color-accent-primary);
  }

  :global(.prose ol li::marker) {
    color: var(--color-accent-primary);
  }
</style>