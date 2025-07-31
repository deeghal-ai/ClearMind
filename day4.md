# Day 4: AI Chat Implementation - Complete Step-by-Step Guide

## Morning Setup (30 minutes)

### Step 1: Verify Day 3 Completion
```bash
# Start your dev server
npm run dev

# Verify roadmap progress tracking works
# Check that context is stored when clicking "Ask AI for Help"
# Ensure all components are functioning
```

### Step 2: Setup OpenAI and Environment
First, update your `.env` file:
```bash
# Add OpenAI API key
OPENAI_API_KEY=sk-your-openai-api-key-here
PUBLIC_SUPABASE_URL=your_existing_url
PUBLIC_SUPABASE_ANON_KEY=your_existing_key
```

Install OpenAI SDK:
```bash
npm install openai
```

### Step 3: Enhance Chat Schema
Run this in your Supabase SQL editor:
```sql
-- Drop existing tables to rebuild with better structure
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS chat_sessions CASCADE;

-- Enhanced chat sessions with better context handling
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT,
  context_type TEXT CHECK (context_type IN ('general', 'roadmap', 'feeds', 'mixed')),
  context_data JSONB DEFAULT '{}',
  model TEXT DEFAULT 'gpt-4-turbo-preview',
  total_tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enhanced messages with token tracking
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Saved prompts for quick access
CREATE TABLE saved_prompts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  category TEXT,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id, created_at DESC);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id, created_at);
CREATE INDEX idx_saved_prompts_user ON saved_prompts(user_id, usage_count DESC);

-- Function to generate chat title from first message
CREATE OR REPLACE FUNCTION generate_chat_title()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'user' AND EXISTS (
    SELECT 1 FROM chat_sessions 
    WHERE id = NEW.session_id AND title IS NULL
  ) THEN
    UPDATE chat_sessions 
    SET title = LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END,
        updated_at = NOW()
    WHERE id = NEW.session_id;
  END IF;
  
  -- Update session timestamp
  UPDATE chat_sessions 
  SET updated_at = NOW() 
  WHERE id = NEW.session_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_chat_title_trigger
AFTER INSERT ON chat_messages
FOR EACH ROW
EXECUTE FUNCTION generate_chat_title();

-- Insert default saved prompts
INSERT INTO saved_prompts (user_id, title, prompt, category) VALUES
('default', 'Explain Like I''m 5', 'Can you explain this concept as if I were 5 years old?', 'learning'),
('default', 'Real-World Example', 'Can you provide a real-world example of how this is used?', 'learning'),
('default', 'Common Mistakes', 'What are the most common mistakes people make with this?', 'learning'),
('default', 'Best Practices', 'What are the current best practices for this?', 'technical'),
('default', 'Debug Help', 'I''m getting this error. Can you help me debug it?', 'technical'),
('default', 'Code Review', 'Can you review this code and suggest improvements?', 'technical'),
('default', 'Learning Path', 'What should I learn next after mastering this?', 'roadmap'),
('default', 'Project Ideas', 'Can you suggest some project ideas to practice this concept?', 'roadmap');
```

## Create API Routes (1 hour)

### Step 4: Create OpenAI API Route
Create `src/routes/api/chat/+server.js`:
```javascript
import { json } from '@sveltejs/kit';
import OpenAI from 'openai';
import { OPENAI_API_KEY } from '$env/static/private';
import { supabase } from '$lib/supabase';

const openai = new OpenAI({
  apiKey: OPENAI_API_KEY
});

export async function POST({ request }) {
  try {
    const { messages, context, sessionId, userId, stream = true } = await request.json();
    
    if (!messages || messages.length === 0) {
      return json({ error: 'No messages provided' }, { status: 400 });
    }
    
    // Build system message based on context
    const systemMessage = buildSystemMessage(context);
    
    // Prepare messages for OpenAI
    const openaiMessages = [
      { role: 'system', content: systemMessage },
      ...messages.map(m => ({ role: m.role, content: m.content }))
    ];
    
    if (stream) {
      // Create a streaming response
      const stream = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true
      });
      
      // Create a readable stream
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const text = chunk.choices[0]?.delta?.content || '';
              if (text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
              }
            }
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        }
      });
      
      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    } else {
      // Non-streaming response
      const completion = await openai.chat.completions.create({
        model: 'gpt-4-turbo-preview',
        messages: openaiMessages,
        temperature: 0.7,
        max_tokens: 1000
      });
      
      const responseMessage = completion.choices[0].message;
      const totalTokens = completion.usage?.total_tokens || 0;
      
      // Save to database if session exists
      if (sessionId && userId) {
        await saveChatMessage(sessionId, responseMessage, totalTokens);
      }
      
      return json({
        message: responseMessage,
        usage: completion.usage
      });
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    return json({ 
      error: 'Failed to generate response',
      details: error.message 
    }, { status: 500 });
  }
}

function buildSystemMessage(context) {
  let systemMessage = `You are a helpful AI learning assistant focused on technical education, 
  particularly in AI, machine learning, and software development. You provide clear, accurate, 
  and practical guidance. Always be encouraging and supportive of the learner's journey.`;
  
  if (!context || context.type === 'general') {
    return systemMessage;
  }
  
  switch (context.type) {
    case 'roadmap':
      systemMessage += `\n\nThe user is currently learning: ${context.roadmap}.`;
      if (context.stage) {
        systemMessage += ` They are on the stage: "${context.stage}".`;
      }
      if (context.completedStages) {
        systemMessage += ` They have completed ${context.completedStages} stages so far.`;
      }
      if (context.prompt) {
        systemMessage += `\n\nThey are asking about this practice prompt: "${context.prompt}"`;
      }
      systemMessage += `\n\nProvide guidance specific to their current learning stage. 
        Offer practical examples and encourage hands-on practice. 
        If they're stuck, provide hints rather than complete solutions.`;
      break;
      
    case 'feeds':
      systemMessage += `\n\nThe user has been reading about the following topics:\n`;
      if (context.articles && context.articles.length > 0) {
        context.articles.forEach(article => {
          systemMessage += `- ${article.title}\n`;
        });
      }
      systemMessage += `\n\nAnswer questions related to these topics and help them understand 
        the concepts better. You can reference the articles they've read when relevant.`;
      break;
      
    case 'mixed':
      if (context.roadmap) {
        systemMessage += `\n\nThe user is working on: ${context.roadmap}`;
      }
      if (context.recentTopics) {
        systemMessage += `\n\nThey've recently read about: ${context.recentTopics.join(', ')}`;
      }
      break;
  }
  
  return systemMessage;
}

async function saveChatMessage(sessionId, message, tokens) {
  try {
    await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        role: message.role,
        content: message.content,
        tokens: tokens
      });
    
    // Update session token count
    await supabase.rpc('increment', {
      table: 'chat_sessions',
      column: 'total_tokens',
      id: sessionId,
      amount: tokens
    });
  } catch (error) {
    console.error('Error saving chat message:', error);
  }
}
```

### Step 5: Create Chat Session Management
Create `src/routes/api/chat/sessions/+server.js`:
```javascript
import { json } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';

// GET all sessions for a user
export async function GET({ url }) {
  const userId = url.searchParams.get('userId');
  
  if (!userId) {
    return json({ error: 'User ID required' }, { status: 400 });
  }
  
  try {
    const { data, error } = await supabase
      .from('chat_sessions')
      .select(`
        *,
        messages:chat_messages(count)
      `)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50);
    
    if (error) throw error;
    
    return json({ sessions: data || [] });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
}

// POST create new session
export async function POST({ request }) {
  try {
    const { userId, contextType = 'general', contextData = {} } = await request.json();
    
    if (!userId) {
      return json({ error: 'User ID required' }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({
        user_id: userId,
        context_type: contextType,
        context_data: contextData
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return json({ session: data });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
}

// DELETE a session
export async function DELETE({ url }) {
  const sessionId = url.searchParams.get('sessionId');
  
  if (!sessionId) {
    return json({ error: 'Session ID required' }, { status: 400 });
  }
  
  try {
    const { error } = await supabase
      .from('chat_sessions')
      .delete()
      .eq('id', sessionId);
    
    if (error) throw error;
    
    return json({ success: true });
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }
}
```

## Build Chat UI Components (2 hours)

### Step 6: Create Chat Store
Create `src/lib/stores/chat.js`:
```javascript
import { writable, derived } from 'svelte/store';
import { supabase } from '$lib/supabase';

function createChatStore() {
  const { subscribe, set, update } = writable({
    sessions: [],
    currentSession: null,
    messages: [],
    loading: false,
    streaming: false,
    error: null
  });
  
  return {
    subscribe,
    
    async loadSessions(userId) {
      update(s => ({ ...s, loading: true }));
      
      try {
        const response = await fetch(`/api/chat/sessions?userId=${userId}`);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error);
        
        update(s => ({ 
          ...s, 
          sessions: data.sessions || [],
          loading: false 
        }));
      } catch (error) {
        update(s => ({ ...s, error: error.message, loading: false }));
      }
    },
    
    async createSession(userId, contextType = 'general', contextData = {}) {
      try {
        const response = await fetch('/api/chat/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, contextType, contextData })
        });
        
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        
        update(s => ({
          ...s,
          currentSession: data.session,
          messages: [],
          sessions: [data.session, ...s.sessions]
        }));
        
        return data.session;
      } catch (error) {
        update(s => ({ ...s, error: error.message }));
        return null;
      }
    },
    
    async loadSession(sessionId) {
      update(s => ({ ...s, loading: true }));
      
      try {
        // Load session details
        const { data: session, error: sessionError } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('id', sessionId)
          .single();
        
        if (sessionError) throw sessionError;
        
        // Load messages
        const { data: messages, error: messagesError } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at');
        
        if (messagesError) throw messagesError;
        
        update(s => ({
          ...s,
          currentSession: session,
          messages: messages || [],
          loading: false
        }));
      } catch (error) {
        update(s => ({ ...s, error: error.message, loading: false }));
      }
    },
    
    async sendMessage(message, userId) {
      const state = get(chatStore);
      
      // Create session if none exists
      if (!state.currentSession) {
        const session = await this.createSession(userId);
        if (!session) return;
      }
      
      // Add user message to UI
      const userMessage = {
        role: 'user',
        content: message,
        created_at: new Date().toISOString()
      };
      
      update(s => ({
        ...s,
        messages: [...s.messages, userMessage],
        streaming: true
      }));
      
      // Save user message to DB
      if (state.currentSession) {
        await supabase
          .from('chat_messages')
          .insert({
            session_id: state.currentSession.id,
            role: 'user',
            content: message
          });
      }
      
      // Prepare context
      const context = state.currentSession?.context_data || {};
      
      try {
        // Stream response
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...state.messages, userMessage],
            context: context,
            sessionId: state.currentSession?.id,
            userId: userId,
            stream: true
          })
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to send message');
        }
        
        // Handle streaming response
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let assistantMessage = {
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString()
        };
        
        // Add empty assistant message
        update(s => ({
          ...s,
          messages: [...s.messages, assistantMessage]
        }));
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') {
                update(s => ({ ...s, streaming: false }));
                
                // Save complete assistant message
                if (state.currentSession) {
                  await supabase
                    .from('chat_messages')
                    .insert({
                      session_id: state.currentSession.id,
                      role: 'assistant',
                      content: assistantMessage.content
                    });
                }
              } else {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.text) {
                    assistantMessage.content += parsed.text;
                    update(s => ({
                      ...s,
                      messages: [...s.messages.slice(0, -1), { ...assistantMessage }]
                    }));
                  }
                } catch (e) {
                  // Ignore parse errors
                }
              }
            }
          }
        }
      } catch (error) {
        update(s => ({ 
          ...s, 
          error: error.message, 
          streaming: false 
        }));
      }
    },
    
    clearError() {
      update(s => ({ ...s, error: null }));
    },
    
    clearChat() {
      update(s => ({ 
        ...s, 
        currentSession: null, 
        messages: [] 
      }));
    }
  };
}

export const chatStore = createChatStore();

// For accessing store value outside components
import { get } from 'svelte/store';

// Derived store for current context
export const currentContext = derived(
  chatStore,
  $store => $store.currentSession?.context_data || {}
);
```

### Step 7: Create Message Component
Create `src/lib/components/ChatMessage.svelte`:
```svelte
<script>
  import { onMount } from 'svelte';
  import { marked } from 'marked';
  
  export let message;
  export let streaming = false;
  
  // Install marked
  onMount(async () => {
    if (!window.marked) {
      const markedModule = await import('marked');
      window.marked = markedModule.marked;
    }
  });
  
  function formatContent(content) {
    if (!content) return '';
    
    // Configure marked
    marked.setOptions({
      highlight: function(code, lang) {
        return `<pre class="language-${lang}"><code>${escapeHtml(code)}</code></pre>`;
      },
      breaks: true,
      gfm: true
    });
    
    return marked.parse(content);
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
                 : 'bg-zen-gray-100 text-zen-gray-800'}"
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
        <div class="flex items-center gap-2 mt-2 text-xs text-zen-gray-500">
          <button
            on:click={() => copyCode(message.content)}
            class="hover:text-zen-gray-700 flex items-center gap-1"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </button>
          <span>•</span>
          <span>{new Date(message.created_at).toLocaleTimeString()}</span>
        </div>
      {/if}
    </div>
    
    {#if isUser}
      <div class="flex-shrink-0 w-8 h-8 rounded-full bg-zen-gray-300 flex items-center justify-center">
        <span class="text-zen-gray-700 text-sm">U</span>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Markdown styles */
  :global(.prose pre) {
    @apply bg-zen-gray-800 text-zen-gray-100 p-4 rounded-lg overflow-x-auto;
  }
  
  :global(.prose code) {
    @apply bg-zen-gray-200 text-zen-gray-800 px-1 py-0.5 rounded text-sm;
  }
  
  :global(.prose-invert code) {
    @apply bg-blue-600 text-white;
  }
  
  :global(.prose blockquote) {
    @apply border-l-4 border-blue-500 pl-4 italic;
  }
  
  :global(.prose a) {
    @apply text-blue-600 underline hover:text-blue-700;
  }
  
  :global(.prose-invert a) {
    @apply text-blue-200 hover:text-blue-100;
  }
</style>
```

### Step 8: Create Sidebar Component
Create `src/lib/components/ChatSidebar.svelte`:
```svelte
<script>
  import { createEventDispatcher } from 'svelte';
  import { chatStore } from '$lib/stores/chat';
  
  export let sessions = [];
  export let currentSessionId = null;
  export let userId;
  
  const dispatch = createEventDispatcher();
  
  let showDeleteConfirm = null;
  
  const contextIcons = {
    general: '💬',
    roadmap: '🎯',
    feeds: '📰',
    mixed: '🌐'
  };
  
  async function deleteSession(sessionId) {
    try {
      const response = await fetch(`/api/chat/sessions?sessionId=${sessionId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        chatStore.loadSessions(userId);
        if (currentSessionId === sessionId) {
          dispatch('newChat');
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    }
    
    showDeleteConfirm = null;
  }
  
  function formatDate(date) {
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return d.toLocaleDateString();
  }
</script>

<div class="h-full bg-zen-gray-50 border-r border-zen-gray-200 flex flex-col">
  <!-- Header -->
  <div class="p-4 border-b border-zen-gray-200">
    <button
      on:click={() => dispatch('newChat')}
      class="w-full btn-primary flex items-center justify-center gap-2"
    >
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
      </svg>
      New Chat
    </button>
  </div>
  
  <!-- Sessions List -->
  <div class="flex-1 overflow-y-auto">
    {#if sessions.length === 0}
      <p class="text-center text-zen-gray-500 text-sm p-4">
        No chat history yet
      </p>
    {:else}
      <div class="p-2 space-y-1">
        {#each sessions as session}
          <div class="relative group">
            <button
              on:click={() => dispatch('selectSession', session.id)}
              class="w-full text-left p-3 rounded-lg transition-colors
                     {currentSessionId === session.id 
                       ? 'bg-blue-100 text-blue-900' 
                       : 'hover:bg-zen-gray-100'}"
            >
              <div class="flex items-start gap-2">
                <span class="text-lg">
                  {contextIcons[session.context_type] || '💬'}
                </span>
                <div class="flex-1 min-w-0">
                  <p class="font-medium text-sm truncate">
                    {session.title || 'New Chat'}
                  </p>
                  <p class="text-xs text-zen-gray-500">
                    {formatDate(session.updated_at)}
                  </p>
                </div>
              </div>
            </button>
            
            <!-- Delete button -->
            {#if showDeleteConfirm === session.id}
              <div class="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                <button
                  on:click={() => deleteSession(session.id)}
                  class="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                >
                  Delete
                </button>
                <button
                  on:click={() => showDeleteConfirm = null}
                  class="px-2 py-1 bg-zen-gray-300 text-zen-gray-700 text-xs rounded hover:bg-zen-gray-400"
                >
                  Cancel
                </button>
              </div>
            {:else}
              <button
                on:click|stopPropagation={() => showDeleteConfirm = session.id}
                class="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 
                       p-1 hover:bg-zen-gray-200 rounded transition-opacity"
              >
                <svg class="w-4 h-4 text-zen-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </div>
  
  <!-- Footer -->
  <div class="p-4 border-t border-zen-gray-200">
    <div class="text-xs text-zen-gray-500 space-y-1">
      <p>Model: GPT-4 Turbo</p>
      {#if $chatStore.currentSession?.total_tokens}
        <p>Tokens used: {$chatStore.currentSession.total_tokens.toLocaleString()}</p>
      {/if}
    </div>
  </div>
</div>
```

### Step 9: Create Quick Prompts Component
Create `src/lib/components/QuickPrompts.svelte`:
```svelte
<script>
  import { createEventDispatcher } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { onMount } from 'svelte';
  
  export let context = {};
  
  const dispatch = createEventDispatcher();
  
  let prompts = [];
  let showAll = false;
  
  onMount(async () => {
    // Load saved prompts
    const { data } = await supabase
      .from('saved_prompts')
      .select('*')
      .eq('user_id', 'default')
      .order('usage_count', { ascending: false });
    
    if (data) {
      prompts = data;
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
    if (prompt.id) {
      await supabase.rpc('increment', {
        table: 'saved_prompts',
        column: 'usage_count',
        id: prompt.id,
        amount: 1
      });
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
```

## Build the Complete Chat Page (1.5 hours)

### Step 10: Create the Main Chat Page
Replace `src/routes/chat/+page.svelte`:
```svelte
<script>
  import { onMount, afterUpdate } from 'svelte';
  import { marked } from 'marked';
  import { chatStore, currentContext } from '$lib/stores/chat';
  import { user } from '$lib/stores/user';
  import ChatMessage from '$lib/components/ChatMessage.svelte';
  import ChatSidebar from '$lib/components/ChatSidebar.svelte';
  import QuickPrompts from '$lib/components/QuickPrompts.svelte';
  
  let userId = '';
  let inputValue = '';
  let messagesContainer;
  let showSidebar = true;
  let inputTextarea;
  
  // Load marked
  onMount(async () => {
    // Initialize marked
    const markedModule = await import('marked');
    window.marked = markedModule.marked;
    
    // Initialize user
    user.init();
    const unsubscribe = user.subscribe(u => {
      userId = u.id;
      if (u.id) {
        chatStore.loadSessions(u.id);
      }
    });
    
    // Check for context from other tabs
    const savedContext = localStorage.getItem('learningos_ai_context');
    if (savedContext) {
      try {
        const context = JSON.parse(savedContext);
        await chatStore.createSession(userId, context.type, context);
        localStorage.removeItem('learningos_ai_context');
        
        // Auto-send first message if there's a prompt
        if (context.prompt) {
          inputValue = context.prompt;
          setTimeout(() => sendMessage(), 500);
        }
      } catch (error) {
        console.error('Error parsing context:', error);
      }
    }
    
    return unsubscribe;
  });
  
  // Auto-scroll to bottom when new messages arrive
  afterUpdate(() => {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });
  
  async function sendMessage() {
    if (!inputValue.trim() || $chatStore.streaming) return;
    
    const message = inputValue;
    inputValue = '';
    
    await chatStore.sendMessage(message, userId);
    
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
      <div class="absolute inset-0 bg-black opacity-50" on:click={toggleSidebar}></div>
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
    
    <!-- Input Area -->
    <div class="border-t border-zen-gray-200 p-4 bg-white">
      <form on:submit|preventDefault={sendMessage} class="flex gap-3">
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
```

## Add Polish and Features (1 hour)

### Step 11: Add Code Syntax Highlighting
Install Prism for syntax highlighting:
```bash
npm install prismjs
```

Create `src/lib/utils/highlight.js`:
```javascript
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';

// Import languages
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-sql';

export function highlightCode(code, language = 'javascript') {
  if (!Prism.languages[language]) {
    language = 'javascript';
  }
  
  return Prism.highlight(code, Prism.languages[language], language);
}

// Configure marked to use Prism
export function configureMarked(marked) {
  marked.setOptions({
    highlight: function(code, lang) {
      if (Prism.languages[lang]) {
        return highlightCode(code, lang);
      }
      return code;
    },
    breaks: true,
    gfm: true
  });
}
```

### Step 12: Add Export Chat Feature
Create `src/lib/components/ExportChat.svelte`:
```svelte
<script>
  import { chatStore } from '$lib/stores/chat';
  
  export let sessionId;
  
  function exportAsMarkdown() {
    const messages = $chatStore.messages;
    if (!messages.length) return;
    
    let markdown = `# Chat Export\n\n`;
    markdown += `**Date:** ${new Date().toLocaleString()}\n`;
    markdown += `**Context:** ${$chatStore.currentSession?.context_type || 'General'}\n\n`;
    markdown += `---\n\n`;
    
    messages.forEach(msg => {
      if (msg.role === 'user') {
        markdown += `### User:\n${msg.content}\n\n`;
      } else {
        markdown += `### Assistant:\n${msg.content}\n\n`;
      }
      markdown += `---\n\n`;
    });
    
    // Create blob and download
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }
  
  function copyChat() {
    const messages = $chatStore.messages;
    const text = messages.map(msg => 
      `${msg.role.toUpperCase()}: ${msg.content}`
    ).join('\n\n');
    
    navigator.clipboard.writeText(text);
    
    // Show feedback
    const button = event.target.closest('button');
    const originalText = button.querySelector('span').textContent;
    button.querySelector('span').textContent = 'Copied!';
    setTimeout(() => {
      button.querySelector('span').textContent = originalText;
    }, 2000);
  }
</script>

<div class="flex items-center gap-2">
  <button
    on:click={exportAsMarkdown}
    class="p-2 text-zen-gray-600 hover:bg-zen-gray-100 rounded-lg transition-colors"
    title="Export as Markdown"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  </button>
  
  <button
    on:click={copyChat}
    class="p-2 text-zen-gray-600 hover:bg-zen-gray-100 rounded-lg transition-colors"
    title="Copy conversation"
  >
    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
    <span class="text-sm">Copy</span>
  </button>
</div>
```

### Step 13: Add Voice Input (Bonus)
Create `src/lib/components/VoiceInput.svelte`:
```svelte
<script>
  import { createEventDispatcher } from 'svelte';
  
  export let disabled = false;
  
  const dispatch = createEventDispatcher();
  
  let isRecording = false;
  let recognition = null;
  
  function startRecording() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in your browser.');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    
    recognition.onstart = () => {
      isRecording = true;
    };
    
    recognition.onresult = (event) => {
      const transcript = Array.from(event.results)
        .map(result => result[0])
        .map(result => result.transcript)
        .join('');
      
      if (event.results[0].isFinal) {
        dispatch('transcript', transcript);
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      isRecording = false;
    };
    
    recognition.onend = () => {
      isRecording = false;
    };
    
    recognition.start();
  }
  
  function stopRecording() {
    if (recognition) {
      recognition.stop();
    }
    isRecording = false;
  }
</script>

<button
  on:click={isRecording ? stopRecording : startRecording}
  disabled={disabled}
  class="p-3 rounded-lg transition-colors
         {isRecording 
           ? 'bg-red-500 text-white animate-pulse' 
           : 'text-zen-gray-600 hover:bg-zen-gray-100'}
         disabled:opacity-50 disabled:cursor-not-allowed"
  title={isRecording ? 'Stop recording' : 'Start voice input'}
>
  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
  </svg>
</button>
```

## Testing and Deployment (30 minutes)

### Step 14: Comprehensive Testing
```bash
# 1. Test basic chat
npm run dev
# Navigate to /chat
# Send a simple message
# Verify streaming response works

# 2. Test context from roadmap
# Go to /roadmap
# Click "Ask AI for Help"
# Should open chat with context
# Verify context is mentioned in chat

# 3. Test chat history
# Have multiple conversations
# Refresh page
# Verify sessions persist
# Test switching between sessions

# 4. Test quick prompts
# Click quick prompt buttons
# Verify they populate input

# 5. Test export
# Have a conversation
# Export as markdown
# Verify file downloads

# 6. Test mobile responsive
# Open on mobile size
# Test sidebar toggle
# Test input and scrolling
```

### Step 15: Final Deployment
```bash
# Commit all changes
git add .
git commit -m "Day 4: Complete AI chat with context awareness and streaming"

# Set environment variables in Vercel
vercel env add OPENAI_API_KEY

# Deploy to production
vercel --prod
```

### Step 16: Production Checklist

✅ **Working Features:**
- [ ] Streaming chat responses
- [ ] Context awareness (roadmap, feeds, general)
- [ ] Chat history with sessions
- [ ] Quick prompts
- [ ] Markdown rendering with syntax highlighting
- [ ] Code copying
- [ ] Export chat as markdown
- [ ] Voice input (bonus)
- [ ] Mobile responsive design
- [ ] Error handling

✅ **AI Features:**
- [ ] GPT-4 Turbo integration
- [ ] Context injection from roadmap
- [ ] Context injection from feeds
- [ ] Token usage tracking
- [ ] Conversation memory within session

✅ **Polish:**
- [ ] Loading states
- [ ] Error messages
- [ ] Empty states
- [ ] Keyboard shortcuts
- [ ] Auto-scroll to bottom
- [ ] Smooth animations

## Summary

You now have a fully functional AI chat system that:

1. **Streams responses** for better UX
2. **Maintains context** from roadmap learning and feed reading
3. **Persists chat history** with session management
4. **Renders markdown** with syntax highlighting
5. **Offers quick prompts** based on context
6. **Tracks token usage** for cost awareness
7. **Exports conversations** for future reference
8. **Works on mobile** with responsive design

The chat is deeply integrated with the learning experience:
- When learning a roadmap stage, the AI knows exactly what you're studying
- After reading feeds, you can ask questions about the articles
- The AI maintains conversation context within each session
- Quick prompts adapt based on what you're doing

**Next Steps for Day 5:**
- Build the daily tracker
- Add streak tracking
- Create learning analytics
- Final polish and bug fixes