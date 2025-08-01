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
      <div class="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center shadow-sm" style="background: linear-gradient(135deg, var(--sage-500), var(--sage-600));">
        <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      </div>
    {/if}
    
    <div class="flex-1">
      <div 
        class="prose prose-sm max-w-none rounded-lg p-3 shadow-sm text-sm
               {isUser 
                 ? 'text-white prose-invert' 
                 : 'bg-white'}"
        style="{isUser 
          ? 'background: linear-gradient(135deg, var(--sage-600), var(--sage-700));' 
          : 'border: 1px solid var(--sage-200); color: var(--sage-800);'}"
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
        <div class="flex items-center gap-2 mt-2 text-xs" style="color: var(--sage-600);">
          <button
            on:click={() => copyCode(message.content)}
            class="flex items-center gap-1 px-2 py-1 rounded-lg transition-all hover:shadow-sm"
            style="background: var(--sage-100); color: var(--sage-700);"
            onmouseover="this.style.background='var(--sage-200)'; this.style.color='var(--sage-800)'"
            onmouseout="this.style.background='var(--sage-100)'; this.style.color='var(--sage-700)'"
          >
            <svg class="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
          <span style="color: var(--sage-400);">•</span>
          <span>{new Date(message.created_at).toLocaleTimeString()}</span>
        </div>
      {/if}
    </div>
    
    {#if isUser}
      <div class="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center shadow-sm" style="background: linear-gradient(135deg, var(--sage-400), var(--sage-500));">
        <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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