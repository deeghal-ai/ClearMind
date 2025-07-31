# Day 1: Complete Foundation Setup - Step-by-Step Execution Guide

## Initial Setup (30 minutes)

### Step 1: Create Project
```bash
# Create the SvelteKit project
npm create vite@latest learningos -- --template svelte
cd learningos

# Remove default Vite stuff and add SvelteKit
rm -rf src/assets src/App.svelte src/main.js
npm uninstall @sveltejs/vite-plugin-svelte
npm install -D @sveltejs/kit @sveltejs/adapter-vercel vite

# Install dependencies
npm install -D tailwindcss postcss autoprefixer
npm install @supabase/supabase-js
```

### Step 2: Configure SvelteKit
Create `vite.config.js`:
```javascript
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()]
});
```

Create `svelte.config.js`:
```javascript
import adapter from '@sveltejs/adapter-vercel';

export default {
  kit: {
    adapter: adapter()
  }
};
```

### Step 3: Setup Tailwind CSS
```bash
npx tailwindcss init -p
```

Update `tailwind.config.js`:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        // Zen color palette
        'zen-gray': {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        }
      }
    },
  },
  plugins: [],
}
```

Create `src/app.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply bg-zen-gray-50 text-zen-gray-800;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    -webkit-font-smoothing: antialiased;
  }
}

@layer components {
  .container-zen {
    @apply max-w-4xl mx-auto px-4;
  }
  
  .card-zen {
    @apply bg-white rounded-lg shadow-sm border border-zen-gray-100 p-6;
  }
  
  .btn-primary {
    @apply px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 
           transition-colors duration-200 focus:outline-none focus:ring-2 
           focus:ring-blue-500 focus:ring-offset-2;
  }
}
```

Create `src/app.html`:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>LearningOS - Your AI Learning Sanctuary</title>
    %sveltekit.head%
  </head>
  <body>
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

## Create File Structure (20 minutes)

### Step 4: Setup Directory Structure
```bash
# Create all necessary directories
mkdir -p src/routes
mkdir -p src/routes/feeds
mkdir -p src/routes/roadmap
mkdir -p src/routes/chat
mkdir -p src/routes/tracker
mkdir -p src/lib
mkdir -p src/lib/stores
mkdir -p static
mkdir -p supabase/migrations
```

### Step 5: Create Favicon
Create `static/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" rx="20" fill="#3b82f6"/>
  <text x="50" y="70" font-size="60" text-anchor="middle" fill="white">🧠</text>
</svg>
```

## Setup Supabase Connection (30 minutes)

### Step 6: Environment Configuration
Create `.env`:
```bash
PUBLIC_SUPABASE_URL=your_supabase_url_here
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

Create `.env.example`:
```bash
PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 7: Supabase Client
Create `src/lib/supabase.js`:
```javascript
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';

export const supabase = createClient(
  PUBLIC_SUPABASE_URL,
  PUBLIC_SUPABASE_ANON_KEY
);
```

### Step 8: Database Schema
Create `supabase/migrations/001_initial.sql`:
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roadmaps table (static learning paths)
CREATE TABLE roadmaps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  stages JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User progress tracking
CREATE TABLE progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- Simple string ID for now, no auth
  roadmap_id UUID REFERENCES roadmaps(id) ON DELETE CASCADE,
  completed_stages INTEGER[] DEFAULT '{}',
  current_stage INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, roadmap_id)
);

-- Daily learning logs
CREATE TABLE daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  goal TEXT,
  completed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- Chat sessions (for context)
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL,
  context_type TEXT CHECK (context_type IN ('general', 'roadmap', 'feeds')),
  context_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat messages
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed initial roadmap
INSERT INTO roadmaps (slug, name, description, stages) VALUES
('langchain-basics', 'LangChain Fundamentals', 'Master the basics of LangChain for AI applications', 
'[
  {
    "title": "Introduction to LangChain",
    "description": "Understand what LangChain is and why it matters",
    "estimatedTime": "2 hours",
    "resources": [
      {"type": "docs", "title": "Official Docs", "url": "https://python.langchain.com/docs/get_started/introduction"},
      {"type": "video", "title": "LangChain Explained", "url": "https://www.youtube.com/watch?v=example"}
    ]
  },
  {
    "title": "Chains and Prompts",
    "description": "Learn how to create and combine chains",
    "estimatedTime": "3 hours",
    "resources": [
      {"type": "docs", "title": "Prompt Engineering", "url": "https://python.langchain.com/docs/modules/model_io/prompts/"}
    ]
  }
]'::jsonb);
```

## Create Core Layout and Navigation (45 minutes)

### Step 9: Root Layout
Create `src/routes/+layout.svelte`:
```svelte
<script>
  import '../app.css';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  
  // Simple local storage for user ID (no auth for MVP)
  let userId = '';
  
  onMount(() => {
    userId = localStorage.getItem('learningos_user_id') || '';
    if (!userId) {
      userId = 'user_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('learningos_user_id', userId);
    }
  });
  
  const navigation = [
    { name: 'Feeds', href: '/feeds', emoji: '📰', description: 'Latest AI/ML content' },
    { name: 'Roadmap', href: '/roadmap', emoji: '🎯', description: 'Structured learning paths' },
    { name: 'Chat', href: '/chat', emoji: '💬', description: 'AI learning assistant' },
    { name: 'Tracker', href: '/tracker', emoji: '✅', description: 'Track daily progress' }
  ];
  
  $: currentPath = $page.url.pathname;
</script>

<div class="min-h-screen bg-zen-gray-50">
  <!-- Header -->
  <header class="bg-white border-b border-zen-gray-200">
    <div class="container-zen">
      <div class="flex items-center justify-between h-16">
        <a href="/" class="flex items-center space-x-2">
          <span class="text-2xl">🧠</span>
          <span class="font-semibold text-lg">LearningOS</span>
        </a>
        <span class="text-sm text-zen-gray-500">
          {#if userId}
            ID: {userId.slice(0, 8)}
          {/if}
        </span>
      </div>
    </div>
  </header>
  
  <!-- Navigation -->
  <nav class="bg-white border-b border-zen-gray-100 sticky top-0 z-10">
    <div class="container-zen">
      <div class="flex space-x-1">
        {#each navigation as item}
          <a 
            href={item.href}
            class="flex items-center px-4 py-3 text-sm font-medium rounded-t-lg
                   transition-all duration-200 hover:bg-zen-gray-50
                   {currentPath.startsWith(item.href) 
                     ? 'text-blue-600 border-b-2 border-blue-500 bg-blue-50/50' 
                     : 'text-zen-gray-600 border-b-2 border-transparent'}"
          >
            <span class="text-lg mr-2">{item.emoji}</span>
            <span>{item.name}</span>
          </a>
        {/each}
      </div>
    </div>
  </nav>
  
  <!-- Main Content -->
  <main class="container-zen py-8">
    <slot />
  </main>
</div>

<style>
  /* Smooth transitions for navigation */
  nav a {
    position: relative;
  }
  
  /* Loading indicator */
  :global(.loading) {
    @apply animate-pulse bg-zen-gray-200 rounded;
  }
</style>
```

### Step 10: Create Stores
Create `src/lib/stores/user.js`:
```javascript
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

function createUserStore() {
  const { subscribe, set, update } = writable({
    id: '',
    currentRoadmap: null,
    preferences: {}
  });

  return {
    subscribe,
    init: () => {
      if (browser) {
        const userId = localStorage.getItem('learningos_user_id') || '';
        const prefs = JSON.parse(localStorage.getItem('learningos_prefs') || '{}');
        set({ id: userId, currentRoadmap: null, preferences: prefs });
      }
    },
    setPreference: (key, value) => {
      update(u => {
        u.preferences[key] = value;
        if (browser) {
          localStorage.setItem('learningos_prefs', JSON.stringify(u.preferences));
        }
        return u;
      });
    }
  };
}

export const user = createUserStore();
```

## Create Page Templates (45 minutes)

### Step 11: Home Page
Create `src/routes/+page.svelte`:
```svelte
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  
  onMount(() => {
    // Auto-redirect to feeds
    goto('/feeds');
  });
</script>

<div class="flex items-center justify-center min-h-[60vh]">
  <div class="text-center">
    <div class="text-6xl mb-4">🧠</div>
    <h1 class="text-2xl font-semibold text-zen-gray-700">Loading your learning sanctuary...</h1>
  </div>
</div>
```

### Step 12: Feeds Page Shell
Create `src/routes/feeds/+page.svelte`:
```svelte
<script>
  import { onMount } from 'svelte';
  
  let feeds = [];
  let loading = true;
  let error = null;
  
  // Placeholder data for now
  const placeholderFeeds = [
    {
      source: 'HackerNews',
      items: [
        {
          title: 'Understanding LLM Architectures',
          description: 'A deep dive into how modern language models work...',
          link: 'https://example.com',
          pubDate: new Date().toISOString()
        }
      ]
    }
  ];
  
  onMount(async () => {
    try {
      // Simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      feeds = placeholderFeeds;
    } catch (e) {
      error = e.message;
    } finally {
      loading = false;
    }
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-2xl font-semibold">AI/ML Feeds</h1>
    <button class="btn-primary">
      Refresh Feeds
    </button>
  </div>
  
  {#if loading}
    <div class="space-y-4">
      <div class="card-zen loading h-32"></div>
      <div class="card-zen loading h-32"></div>
    </div>
  {:else if error}
    <div class="card-zen bg-red-50 border-red-200">
      <p class="text-red-600">Error: {error}</p>
    </div>
  {:else if feeds.length === 0}
    <div class="card-zen text-center py-12">
      <p class="text-zen-gray-500">No feeds available. Click refresh to load.</p>
    </div>
  {:else}
    {#each feeds as feed}
      <div class="card-zen">
        <h2 class="font-semibold mb-4">{feed.source}</h2>
        <div class="space-y-3">
          {#each feed.items as item}
            <a 
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              class="block p-3 -mx-3 rounded hover:bg-zen-gray-50 transition-colors"
            >
              <h3 class="font-medium text-blue-600 hover:underline">
                {item.title}
              </h3>
              <p class="text-sm text-zen-gray-600 mt-1">
                {item.description}
              </p>
            </a>
          {/each}
        </div>
      </div>
    {/each}
  {/if}
</div>
```

### Step 13: Roadmap Page Shell
Create `src/routes/roadmap/+page.svelte`:
```svelte
<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  
  let roadmaps = [];
  let selectedRoadmap = null;
  let loading = true;
  
  onMount(async () => {
    const { data, error } = await supabase
      .from('roadmaps')
      .select('*')
      .order('created_at');
    
    if (data && data.length > 0) {
      roadmaps = data;
      selectedRoadmap = data[0];
    }
    loading = false;
  });
</script>

<div class="space-y-6">
  <h1 class="text-2xl font-semibold">Learning Roadmaps</h1>
  
  {#if loading}
    <div class="card-zen loading h-64"></div>
  {:else if roadmaps.length === 0}
    <div class="card-zen text-center py-12">
      <p class="text-zen-gray-500">No roadmaps available yet.</p>
    </div>
  {:else}
    <div class="card-zen">
      <div class="mb-4">
        <label class="block text-sm font-medium text-zen-gray-700 mb-2">
          Select a roadmap:
        </label>
        <select 
          bind:value={selectedRoadmap}
          class="w-full px-3 py-2 border border-zen-gray-300 rounded-lg"
        >
          {#each roadmaps as roadmap}
            <option value={roadmap}>{roadmap.name}</option>
          {/each}
        </select>
      </div>
      
      {#if selectedRoadmap}
        <div class="mt-6">
          <h2 class="text-lg font-semibold">{selectedRoadmap.name}</h2>
          <p class="text-zen-gray-600 mt-1">{selectedRoadmap.description}</p>
          
          <div class="mt-6 space-y-4">
            {#each selectedRoadmap.stages as stage, index}
              <div class="border-l-2 border-zen-gray-200 pl-4">
                <h3 class="font-medium">
                  {index + 1}. {stage.title}
                </h3>
                <p class="text-sm text-zen-gray-600 mt-1">
                  {stage.description}
                </p>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>
```

### Step 14: Chat Page Shell
Create `src/routes/chat/+page.svelte`:
```svelte
<script>
  let messages = [];
  let inputValue = '';
  let thinking = false;
  
  function sendMessage() {
    if (!inputValue.trim()) return;
    
    messages = [...messages, { role: 'user', content: inputValue }];
    inputValue = '';
    thinking = true;
    
    // Simulate AI response
    setTimeout(() => {
      messages = [...messages, {
        role: 'assistant',
        content: 'I\'m your AI learning assistant. This feature will be connected to OpenAI soon!'
      }];
      thinking = false;
    }, 1000);
  }
</script>

<div class="max-w-2xl mx-auto">
  <div class="card-zen" style="height: 60vh; display: flex; flex-direction: column;">
    <h1 class="text-xl font-semibold mb-4">AI Learning Assistant</h1>
    
    <div class="flex-1 overflow-y-auto space-y-4 mb-4">
      {#if messages.length === 0}
        <div class="text-center text-zen-gray-500 mt-8">
          <p>Ask me anything about your learning journey!</p>
          <p class="text-sm mt-2">I can help with concepts, roadmap guidance, and more.</p>
        </div>
      {/if}
      
      {#each messages as message}
        <div class="flex {message.role === 'user' ? 'justify-end' : 'justify-start'}">
          <div class="max-w-[80%] p-3 rounded-lg {message.role === 'user' 
            ? 'bg-blue-500 text-white' 
            : 'bg-zen-gray-100'}">
            {message.content}
          </div>
        </div>
      {/each}
      
      {#if thinking}
        <div class="flex justify-start">
          <div class="bg-zen-gray-100 p-3 rounded-lg">
            <span class="loading inline-block w-2 h-2 rounded-full"></span>
            <span class="loading inline-block w-2 h-2 rounded-full mx-1"></span>
            <span class="loading inline-block w-2 h-2 rounded-full"></span>
          </div>
        </div>
      {/if}
    </div>
    
    <form on:submit|preventDefault={sendMessage} class="flex gap-2">
      <input
        bind:value={inputValue}
        placeholder="Type your question..."
        class="flex-1 px-4 py-2 border border-zen-gray-300 rounded-lg"
      />
      <button type="submit" class="btn-primary">
        Send
      </button>
    </form>
  </div>
</div>
```

### Step 15: Tracker Page Shell
Create `src/routes/tracker/+page.svelte`:
```svelte
<script>
  import { onMount } from 'svelte';
  
  let todayGoal = '';
  let streak = 0;
  let recentLogs = [];
  
  onMount(() => {
    // Load today's goal and calculate streak
    streak = Math.floor(Math.random() * 7); // Placeholder
  });
  
  function saveGoal() {
    if (!todayGoal.trim()) return;
    // Will connect to Supabase
    alert('Goal saved! (Will be connected to database)');
  }
</script>

<div class="max-w-2xl mx-auto space-y-6">
  <h1 class="text-2xl font-semibold">Daily Learning Tracker</h1>
  
  {#if streak > 0}
    <div class="card-zen bg-orange-50 border-orange-200 text-center">
      <div class="text-3xl mb-2">🔥</div>
      <p class="text-lg font-semibold">{streak} Day Learning Streak!</p>
      <p class="text-sm text-zen-gray-600 mt-1">Keep up the great work!</p>
    </div>
  {/if}
  
  <div class="card-zen">
    <h2 class="font-semibold mb-4">Today's Learning Goal</h2>
    <form on:submit|preventDefault={saveGoal} class="space-y-4">
      <textarea
        bind:value={todayGoal}
        placeholder="What will you focus on learning today?"
        class="w-full px-4 py-3 border border-zen-gray-300 rounded-lg resize-none"
        rows="3"
      ></textarea>
      <button type="submit" class="btn-primary">
        Set Goal
      </button>
    </form>
  </div>
  
  <div class="card-zen">
    <h2 class="font-semibold mb-4">Recent Activity</h2>
    <p class="text-zen-gray-500 text-sm">Your learning history will appear here.</p>
  </div>
</div>
```

## Final Setup and Testing (30 minutes)

### Step 16: Package.json Scripts
Update `package.json`:
```json
{
  "name": "learningos",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./jsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./jsconfig.json --watch"
  },
  "devDependencies": {
    "@sveltejs/adapter-vercel": "^5.0.0",
    "@sveltejs/kit": "^2.0.0",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.32",
    "svelte": "^4.2.7",
    "tailwindcss": "^3.3.0",
    "vite": "^5.0.0"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.39.0"
  },
  "type": "module"
}
```

### Step 17: Add .gitignore
Create `.gitignore`:
```
.DS_Store
node_modules
/build
/.svelte-kit
/package
.env
.env.*
!.env.example
vite.config.js.timestamp-*
vite.config.ts.timestamp-*
```

### Step 18: Test Locally
```bash
# Start the development server
npm run dev

# Should open at http://localhost:5173
# Test all navigation tabs work
# Verify no console errors
```

### Step 19: Deploy to Vercel
```bash
# Initialize git
git init
git add .
git commit -m "Initial LearningOS foundation"

# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Set up and deploy
# - Which scope? (your account)
# - Link to existing project? No
# - Project name? learningos
# - Directory? ./
# - Override settings? No
```

### Step 20: Final Verification Checklist

✅ **Working Features:**
- [ ] Navigation between all 4 tabs
- [ ] Responsive design on mobile
- [ ] Clean, zen-like aesthetic
- [ ] No console errors
- [ ] Deployed to Vercel successfully

✅ **Ready for Day 2:**
- [ ] Supabase client configured
- [ ] Database schema ready
- [ ] All page shells in place
- [ ] Consistent styling system
- [ ] User ID persistence

## Summary

You now have:
1. A working SvelteKit app with 4 navigable tabs
2. Clean, minimalist design following your zen philosophy
3. Supabase connection ready (just need to add credentials)
4. Deployed to Vercel for immediate testing
5. All foundational components for the next 4 days of features

The app is intentionally bare-bones but fully functional. Each tab has placeholder content that will be replaced with real features in the coming days. The architecture supports rapid feature development without refactoring.

**Next Steps for Day 2:**
- Add your Supabase credentials to `.env`
- Run the migration in Supabase dashboard
- Start building the RSS feed aggregation