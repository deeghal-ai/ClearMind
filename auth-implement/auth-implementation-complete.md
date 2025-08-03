# Complete Supabase Auth Implementation Guide for ClearMind

This guide provides step-by-step instructions with complete code for integrating Supabase Auth into your ClearMind application.

## Table of Contents
1. [Prerequisites & Setup](#prerequisites--setup)
2. [Core Auth Infrastructure](#core-auth-infrastructure)
3. [Auth UI Components](#auth-ui-components)
4. [Route Protection & Layouts](#route-protection--layouts)
5. [Store Updates](#store-updates)
6. [Service Layer Updates](#service-layer-updates)
7. [Component Updates](#component-updates)
8. [Migration & Cleanup](#migration--cleanup)
9. [Environment Configuration](#environment-configuration)

## Prerequisites & Setup

### 1. Install Dependencies
```bash
npm install @supabase/auth-helpers-sveltekit
```

### 2. Supabase Dashboard Setup
1. Go to your Supabase project → Authentication → Settings
2. Enable Email provider
3. Add site URL: `http://localhost:5174`
4. Add redirect URLs:
   - `http://localhost:5174/*`
   - `http://localhost:5174/auth/callback`
   - `https://yourdomain.com/*` (for production)
5. Configure email templates (optional for MVP)

### 3. Verify RLS Policies
Ensure all your RLS policies use `auth.uid()`:
```sql
-- Example RLS policy update
CREATE POLICY "Users can only see their own data" ON user_feeds
FOR ALL USING (auth.uid() = user_id);
```

## Core Auth Infrastructure

### File: `src/lib/services/auth.js`
Create this new file:

```javascript
import { supabase } from '$lib/supabase';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';

export const authService = {
  async signUp(email, password) {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            // Can add user metadata here if needed
          }
        }
      });
      
      if (error) throw error;
      
      return { 
        success: true, 
        data, 
        message: 'Check your email to confirm your account!' 
      };
    } catch (error) {
      console.error('SignUp error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  async signIn(email, password) {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      return { success: true, data };
    } catch (error) {
      console.error('SignIn error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  async signInWithMagicLink(email) {
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      
      if (error) throw error;
      
      return { 
        success: true, 
        data,
        message: 'Check your email for the magic link!' 
      };
    } catch (error) {
      console.error('Magic link error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  async signOut() {
    try {
      // Clear all local storage
      if (browser) {
        localStorage.removeItem('learningos_user_id');
        localStorage.removeItem('learningos_user_name');
        localStorage.removeItem('learningos_prefs');
        localStorage.removeItem('daily_logs');
        localStorage.removeItem('feed_states');
        localStorage.removeItem('roadmap_progress');
      }
      
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Redirect to login
      if (browser) {
        await goto('/login');
      }
      
      return { success: true };
    } catch (error) {
      console.error('SignOut error:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  },

  async getUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) {
      console.error('Get user error:', error);
      return null;
    }
    return user;
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Get session error:', error);
      return null;
    }
    return session;
  },

  // Helper to format auth errors
  formatError(error) {
    if (error.includes('Email not confirmed')) {
      return 'Please check your email to confirm your account';
    }
    if (error.includes('Invalid login')) {
      return 'Invalid email or password';
    }
    if (error.includes('User already registered')) {
      return 'An account with this email already exists';
    }
    return error;
  }
};
```

### File: `src/lib/stores/user.js`
Replace the entire file:

```javascript
import { writable, derived, get } from 'svelte/store';
import { supabase } from '$lib/supabase';
import { browser } from '$app/environment';

function createAuthStore() {
  const { subscribe, set, update } = writable({
    user: null,
    session: null,
    loading: true,
    initialized: false,
    error: null
  });

  let authListener = null;

  return {
    subscribe,
    
    async init() {
      if (!browser) return;

      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        set({
          user: session?.user ?? null,
          session: session ?? null,
          loading: false,
          initialized: true,
          error: null
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth event:', event);
            
            set({
              user: session?.user ?? null,
              session: session ?? null,
              loading: false,
              initialized: true,
              error: null
            });

            // Handle specific auth events
            switch (event) {
              case 'SIGNED_IN':
                console.log('User signed in:', session.user.email);
                // Reload stores after sign in
                const { trackerStore } = await import('./tracker.js');
                const { roadmapStore } = await import('./roadmap.js');
                const { feedsStore } = await import('./feeds.js');
                
                if (session?.user?.id) {
                  await Promise.all([
                    trackerStore.loadToday(session.user.id),
                    roadmapStore.loadAllProgress(session.user.id),
                    feedsStore.loadUserFeeds()
                  ]);
                }
                break;
                
              case 'SIGNED_OUT':
                console.log('User signed out');
                // Clear all stores
                const stores = await Promise.all([
                  import('./tracker.js'),
                  import('./roadmap.js'),
                  import('./feeds.js'),
                  import('./chat.js')
                ]);
                
                stores.forEach(module => {
                  if (module.trackerStore?.reset) module.trackerStore.reset();
                  if (module.roadmapStore?.reset) module.roadmapStore.reset();
                  if (module.feedsStore?.reset) module.feedsStore.reset();
                  if (module.chatStore?.reset) module.chatStore.reset();
                });
                break;
                
              case 'TOKEN_REFRESHED':
                console.log('Token refreshed');
                break;
                
              case 'USER_UPDATED':
                console.log('User updated:', session.user);
                break;
            }
          }
        );

        authListener = subscription;
        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Auth initialization error:', error);
        set({
          user: null,
          session: null,
          loading: false,
          initialized: true,
          error: error.message
        });
      }
    },

    async checkSession() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        update(state => ({
          ...state,
          user: session?.user ?? null,
          session: session ?? null,
          loading: false
        }));
        
        return session;
      } catch (error) {
        console.error('Session check error:', error);
        update(state => ({
          ...state,
          error: error.message,
          loading: false
        }));
        return null;
      }
    },

    cleanup() {
      if (authListener) {
        authListener.unsubscribe();
        authListener = null;
      }
    },

    reset() {
      set({
        user: null,
        session: null,
        loading: false,
        initialized: true,
        error: null
      });
    }
  };
}

// Create store instances
export const authStore = createAuthStore();

// Derived stores for easy access
export const user = derived(authStore, $auth => $auth.user);
export const userId = derived(user, $user => $user?.id ?? null);
export const userEmail = derived(user, $user => $user?.email ?? null);
export const isAuthenticated = derived(authStore, $auth => !!$auth.user && $auth.initialized);
export const isLoading = derived(authStore, $auth => $auth.loading);

// Legacy support - gradually phase these out
export const userName = derived(user, $user => $user?.email?.split('@')[0] ?? 'Learner');
```

## Auth UI Components

### File: `src/routes/(auth)/+layout.svelte`
Create the auth layout group:

```svelte
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore, isAuthenticated } from '$lib/stores/user';
  import '../../app.css';

  onMount(() => {
    // Initialize auth store
    const unsubscribeAuth = authStore.init();
    
    // Redirect if already authenticated
    const unsubscribe = isAuthenticated.subscribe(authenticated => {
      if (authenticated) {
        goto('/feeds');
      }
    });

    return () => {
      unsubscribe();
      if (unsubscribeAuth) unsubscribeAuth();
    };
  });
</script>

{#if $authStore.loading}
  <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-teal-100">
    <div class="text-center">
      <div class="text-5xl mb-4">🧠</div>
      <p class="text-gray-600">Loading...</p>
    </div>
  </div>
{:else}
  <slot />
{/if}
```

### File: `src/routes/(auth)/login/+page.svelte`
Create the login page:

```svelte
<script>
  import { authService } from '$lib/services/auth';
  import { goto } from '$app/navigation';
  
  let email = '';
  let password = '';
  let isSignUp = false;
  let loading = false;
  let error = null;
  let success = null;
  let usePasswordMode = true;

  async function handlePasswordAuth() {
    loading = true;
    error = null;
    success = null;

    const result = isSignUp 
      ? await authService.signUp(email, password)
      : await authService.signIn(email, password);

    if (result.success) {
      if (isSignUp) {
        success = result.message;
        // Clear form
        email = '';
        password = '';
      } else {
        // Redirect on successful login
        await goto('/feeds');
      }
    } else {
      error = authService.formatError(result.error);
    }
    
    loading = false;
  }

  async function handleMagicLink() {
    if (!email) {
      error = 'Please enter your email address';
      return;
    }

    loading = true;
    error = null;
    success = null;

    const result = await authService.signInWithMagicLink(email);
    
    if (result.success) {
      success = result.message;
      usePasswordMode = false;
    } else {
      error = authService.formatError(result.error);
    }
    
    loading = false;
  }

  function toggleMode() {
    isSignUp = !isSignUp;
    error = null;
    success = null;
  }

  function resetForm() {
    email = '';
    password = '';
    error = null;
    success = null;
  }
</script>

<svelte:head>
  <title>ClearMind - {isSignUp ? 'Sign Up' : 'Sign In'}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center p-4">
  <div class="max-w-md w-full">
    <!-- Logo and Title -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-20 h-20 bg-teal-600 rounded-2xl mb-4 shadow-lg">
        <span class="text-4xl">🧠</span>
      </div>
      <h1 class="text-3xl font-bold text-gray-900">ClearMind</h1>
      <p class="text-gray-600 mt-2">Your sanctuary for focused learning</p>
    </div>

    <!-- Auth Form -->
    <div class="bg-white rounded-2xl shadow-xl p-8">
      {#if success}
        <div class="text-center">
          <div class="text-5xl mb-4">
            {isSignUp || !usePasswordMode ? '📧' : '✅'}
          </div>
          <h2 class="text-xl font-semibold mb-2">
            {isSignUp || !usePasswordMode ? 'Check your email!' : 'Success!'}
          </h2>
          <p class="text-gray-600 mb-4">{success}</p>
          {#if isSignUp}
            <button
              on:click={() => { resetForm(); isSignUp = false; }}
              class="text-teal-600 hover:text-teal-700 font-medium"
            >
              Back to sign in
            </button>
          {/if}
        </div>
      {:else}
        {#if usePasswordMode}
          <form on:submit|preventDefault={handlePasswordAuth} class="space-y-6">
            <div>
              <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                bind:value={email}
                required
                disabled={loading}
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                bind:value={password}
                required
                disabled={loading}
                minlength="6"
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                placeholder="••••••••"
              />
              {#if isSignUp}
                <p class="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
              {/if}
            </div>

            {#if error}
              <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            {/if}

            <button
              type="submit"
              disabled={loading}
              class="w-full py-3 px-4 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {#if loading}
                <span class="flex items-center justify-center">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </span>
              {:else}
                {isSignUp ? 'Create Account' : 'Sign In'}
              {/if}
            </button>

            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <button
              type="button"
              on:click={handleMagicLink}
              disabled={loading || !email}
              class="w-full py-3 px-4 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span class="flex items-center justify-center">
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
                Send Magic Link
              </span>
            </button>
          </form>

          <p class="mt-6 text-center text-sm text-gray-600">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              on:click={toggleMode}
              disabled={loading}
              class="font-medium text-teal-600 hover:text-teal-500 ml-1 disabled:opacity-50"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        {:else}
          <!-- Magic link sent state -->
          <div class="text-center">
            <div class="text-5xl mb-4">📧</div>
            <h2 class="text-xl font-semibold mb-2">Check your email!</h2>
            <p class="text-gray-600 mb-6">We've sent a magic link to {email}</p>
            <button
              on:click={() => { usePasswordMode = true; resetForm(); }}
              class="text-teal-600 hover:text-teal-700 font-medium"
            >
              Back to login
            </button>
          </div>
        {/if}
      {/if}
    </div>

    <!-- Help text -->
    <p class="mt-8 text-center text-sm text-gray-600">
      By signing up, you agree to our{' '}
      <a href="#" class="text-teal-600 hover:text-teal-500">Terms of Service</a>
      {' '}and{' '}
      <a href="#" class="text-teal-600 hover:text-teal-500">Privacy Policy</a>
    </p>
  </div>
</div>
```

### File: `src/routes/auth/callback/+page.svelte`
Create the auth callback handler:

```svelte
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/user';
  
  let error = null;
  
  onMount(async () => {
    try {
      // Supabase handles the callback automatically
      // Wait a moment for auth state to update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check if we're now authenticated
      await authStore.checkSession();
      
      // Redirect to main app
      await goto('/feeds');
    } catch (err) {
      console.error('Callback error:', err);
      error = err.message;
    }
  });
</script>

<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-teal-100">
  <div class="text-center">
    {#if error}
      <div class="text-red-600 mb-4">
        <p>Error: {error}</p>
        <a href="/login" class="text-teal-600 hover:text-teal-700 mt-2 inline-block">
          Back to login
        </a>
      </div>
    {:else}
      <div class="text-5xl mb-4 animate-spin">🔄</div>
      <p class="text-gray-600">Completing sign in...</p>
    {/if}
  </div>
</div>
```

## Route Protection & Layouts

### File: `src/routes/+layout.svelte`
Update the root layout:

```svelte
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore, isAuthenticated } from '$lib/stores/user';
  import { browser } from '$app/environment';
  import '../app.css';

  let authUnsubscribe;
  let initialized = false;

  onMount(() => {
    // Initialize auth
    authUnsubscribe = authStore.init();

    // Watch for auth state changes
    const unsubscribe = authStore.subscribe($auth => {
      if (!$auth.initialized) return;
      
      initialized = true;
      
      // Redirect logic
      const isAuthRoute = window.location.pathname.startsWith('/login') || 
                         window.location.pathname.startsWith('/auth');
      
      if (!$auth.user && !isAuthRoute) {
        // Not authenticated and not on auth page - redirect to login
        goto('/login');
      }
    });

    return () => {
      unsubscribe();
      if (authUnsubscribe) authUnsubscribe();
      authStore.cleanup();
    };
  });
</script>

{#if !initialized}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-center">
      <div class="text-5xl mb-4 animate-pulse">🧠</div>
      <p class="text-gray-600">Loading ClearMind...</p>
    </div>
  </div>
{:else}
  <slot />
{/if}
```

### File: `src/routes/(app)/+layout.svelte`
Create the app layout group:

```svelte
<script>
  import { page } from '$app/stores';
  import { user, userEmail } from '$lib/stores/user';
  import { authService } from '$lib/services/auth';
  import { navigation } from '$lib/stores/navigation.js';
  import { chatPanel } from '$lib/stores/chatPanel.js';
  import RightChatPanel from '$lib/components/RightChatPanel.svelte';
  
  const navigationItems = [
    { name: 'Feeds', id: 'feeds', emoji: '📰' },
    { name: 'Roadmap', id: 'roadmap', emoji: '🎯' },
    { name: 'Tracker', id: 'tracker', emoji: '✅' }
  ];
  
  async function handleSignOut() {
    if (confirm('Are you sure you want to sign out?')) {
      await authService.signOut();
    }
  }
  
  // Set current tab based on URL
  $: if ($page.url.pathname.includes('/feeds')) navigation.setTab('feeds');
  $: if ($page.url.pathname.includes('/roadmap')) navigation.setTab('roadmap');
  $: if ($page.url.pathname.includes('/tracker')) navigation.setTab('tracker');
</script>

<div class="min-h-screen flex" style="background-color: var(--color-zen-50);">
  <!-- Left Sidebar Navigation -->
  <aside class="w-64 min-h-screen flex flex-col" style="background: linear-gradient(180deg, #14B8A6, #0F766E); border-right: 1px solid rgba(255,255,255,0.1);">
    <!-- Logo Section -->
    <div class="px-6 pt-4 pb-6 border-b" style="border-color: rgba(255,255,255,0.1);">
      <div class="flex items-center space-x-3">
        <img src="/clearmind.png" alt="ClearMind Logo" class="w-32 h-32" />
      </div>
    </div>
    
    <!-- Navigation Items -->
    <nav class="flex-1 p-4">
      <div class="space-y-2">
        {#each navigationItems as item}
          <a
            href="/{item.id}"
            class="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-left group
                   {$navigation.currentTab === item.id 
                     ? 'text-white shadow-lg' 
                     : 'text-gray-300 hover:text-white hover:bg-white/10'}"
            style="{$navigation.currentTab === item.id 
                     ? 'background: linear-gradient(135deg, #06B6D4, #0891B2); box-shadow: 0 4px 12px rgba(6, 182, 212, 0.3);' 
                     : ''}"
          >
            <span class="text-xl">{item.emoji}</span>
            <span class="font-medium">{item.name}</span>
          </a>
        {/each}
        
        <!-- Chat Button -->
        <button
          on:click={() => chatPanel.toggle()}
          class="w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 text-left group
                 text-gray-300 hover:text-white hover:bg-white/10 mt-4"
        >
          <span class="text-xl">💬</span>
          <span class="font-medium">AI Chat</span>
          <span class="text-xs ml-auto opacity-60">⌘/</span>
        </button>
      </div>
    </nav>
    
    <!-- User Info Section -->
    <div class="p-4 border-t" style="border-color: rgba(255,255,255,0.1);">
      <div class="bg-white/10 rounded-lg p-3 mb-3">
        <p class="text-white/70 text-sm truncate">{$userEmail || 'Loading...'}</p>
      </div>
      <button 
        on:click={handleSignOut}
        class="w-full text-left px-3 py-2 rounded-lg transition-colors text-white/70 hover:text-white hover:bg-white/10 text-sm"
      >
        Sign Out
      </button>
    </div>
  </aside>
  
  <!-- Main Content Area -->
  <main class="flex-1 overflow-auto flex flex-col">
    <!-- App Header -->
    <header class="bg-gradient-to-r from-white via-gray-50/95 to-white backdrop-blur-sm border-b border-gray-300/60 px-8 py-6 shadow-sm">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse shadow-sm"></div>
          <span class="text-lg font-semibold text-gray-800 tracking-wide">
            {$navigation.currentTab.charAt(0).toUpperCase() + $navigation.currentTab.slice(1)}
          </span>
        </div>
        
        <div class="flex items-center gap-4">
          <div class="flex items-center gap-3 px-3 py-1.5 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-full border border-teal-200/50">
            <div class="w-2 h-2 bg-gradient-to-r from-teal-400 to-cyan-500 rounded-full animate-pulse"></div>
            <span class="text-sm font-medium text-teal-700">AI-Powered Learning</span>
          </div>
        </div>
      </div>
    </header>
    
    <!-- Page Content -->
    <div class="flex-1 p-8">
      <slot />
    </div>
  </main>
  
  <!-- Right Chat Panel -->
  {#if $user}
    <RightChatPanel userId={$user.id} />
  {/if}
</div>
```

### Move Existing Routes
Move your existing page components to the app group:
```bash
# Create app group directory
mkdir -p src/routes/\(app\)

# Move existing routes
mv src/routes/feeds src/routes/\(app\)/feeds
mv src/routes/roadmap src/routes/\(app\)/roadmap
mv src/routes/tracker src/routes/\(app\)/tracker
```

## Store Updates

### File: `src/lib/stores/tracker.js`
Update to use auth:

```javascript
import { writable, get } from 'svelte/store';
import { supabase } from '../supabase.js';
import { userId } from './user.js';

function createTrackerStore() {
  const { subscribe, set, update } = writable({
    currentLog: null,
    logs: [],
    loading: false,
    error: null,
    streak: 0,
    todayCompleted: false
  });

  return {
    subscribe,
    
    async loadToday(userIdParam = null) {
      // Get userId from auth if not provided
      const authUserId = userIdParam || get(userId);
      if (!authUserId) {
        console.log('No user ID available');
        return;
      }
      
      update(s => ({ ...s, loading: true }));
      
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Load today's log
        const { data: todayLog, error: todayError } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', authUserId)
          .eq('date', today)
          .single();
        
        if (todayError && todayError.code !== 'PGRST116') {
          throw todayError;
        }
        
        // Load recent logs for streak calculation
        const { data: recentLogs, error: logsError } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('user_id', authUserId)
          .order('date', { ascending: false })
          .limit(30);
        
        if (logsError) throw logsError;
        
        // Calculate streak
        const streak = this.calculateStreak(recentLogs || []);
        
        update(s => ({
          ...s,
          currentLog: todayLog || { date: today, goals: [], completed: false },
          logs: recentLogs || [],
          streak,
          todayCompleted: todayLog?.completed || false,
          loading: false
        }));
      } catch (error) {
        console.error('Error loading today:', error);
        update(s => ({ ...s, error: error.message, loading: false }));
      }
    },
    
    async addGoal(goal) {
      const authUserId = get(userId);
      if (!authUserId || !goal) return;
      
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Get current goals
        const currentState = get(trackerStore);
        const currentGoals = currentState.currentLog?.goals || [];
        const updatedGoals = [...currentGoals, { text: goal, completed: false, id: Date.now() }];
        
        const { data, error } = await supabase
          .from('daily_logs')
          .upsert({
            user_id: authUserId,
            date: today,
            goals: updatedGoals,
            completed: false
          }, {
            onConflict: 'user_id,date'
          })
          .select()
          .single();
        
        if (error) throw error;
        
        update(s => ({
          ...s,
          currentLog: data
        }));
      } catch (error) {
        console.error('Error adding goal:', error);
        update(s => ({ ...s, error: error.message }));
      }
    },
    
    async toggleGoal(goalId) {
      const authUserId = get(userId);
      if (!authUserId || !goalId) return;
      
      try {
        const currentState = get(trackerStore);
        const goals = currentState.currentLog?.goals || [];
        const updatedGoals = goals.map(g => 
          g.id === goalId ? { ...g, completed: !g.completed } : g
        );
        
        const allCompleted = updatedGoals.length > 0 && updatedGoals.every(g => g.completed);
        
        const { data, error } = await supabase
          .from('daily_logs')
          .update({
            goals: updatedGoals,
            completed: allCompleted,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', authUserId)
          .eq('date', new Date().toISOString().split('T')[0])
          .select()
          .single();
        
        if (error) throw error;
        
        update(s => ({
          ...s,
          currentLog: data,
          todayCompleted: allCompleted
        }));
      } catch (error) {
        console.error('Error toggling goal:', error);
        update(s => ({ ...s, error: error.message }));
      }
    },
    
    calculateStreak(logs) {
      if (!logs || logs.length === 0) return 0;
      
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      for (let i = 0; i < logs.length; i++) {
        const logDate = new Date(logs[i].date);
        logDate.setHours(0, 0, 0, 0);
        
        const daysDiff = Math.floor((today - logDate) / (1000 * 60 * 60 * 24));
        
        if (daysDiff === i && logs[i].completed) {
          streak++;
        } else {
          break;
        }
      }
      
      return streak;
    },
    
    reset() {
      set({
        currentLog: null,
        logs: [],
        loading: false,
        error: null,
        streak: 0,
        todayCompleted: false
      });
    }
  };
}

export const trackerStore = createTrackerStore();
```

### Update Other Stores Similarly
Update `roadmap.js`, `feeds.js`, and `chat.js` stores to:
1. Import `userId` from the user store
2. Use `get(userId)` instead of accepting userId as parameter
3. Add reset methods for logout
4. Remove userId parameters from all methods

## Service Layer Updates

### File: `src/lib/services/feedStorageService.js`
Update all methods to use auth:

```javascript
import { supabase } from '$lib/supabase';
import { authService } from './auth';
import { defaultFeeds } from '$lib/feedSources';

class FeedStorageService {
  constructor() {
    this.defaultFeeds = defaultFeeds;
  }

  /**
   * Get current user ID from auth
   */
  async getCurrentUserId() {
    const user = await authService.getUser();
    if (!user) throw new Error('User not authenticated');
    return user.id;
  }

  /**
   * Initialize user feeds on first login
   */
  async initializeUserFeeds() {
    try {
      const userId = await this.getCurrentUserId();
      
      // Check if user already has feeds
      const { data: existingFeeds, error: checkError } = await supabase
        .from('user_feeds')
        .select('id')
        .eq('user_id', userId)
        .limit(1);

      if (checkError) throw checkError;

      // If user has feeds, don't initialize
      if (existingFeeds && existingFeeds.length > 0) {
        return { success: true, message: 'Feeds already initialized' };
      }

      // Insert default feeds for new user
      const feedsToInsert = this.defaultFeeds.map(feed => ({
        user_id: userId,
        feed_key: feed.id,
        feed_name: feed.name,
        feed_url: feed.url,
        feed_category: feed.category,
        feed_description: feed.description || `Latest from ${feed.name}`,
        is_enabled: feed.active !== false,
        is_custom: false
      }));

      const { error: insertError } = await supabase
        .from('user_feeds')
        .insert(feedsToInsert);

      if (insertError) throw insertError;

      return { success: true, message: 'Feeds initialized successfully' };
    } catch (error) {
      console.error('Error initializing feeds:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's feed preferences
   */
  async getFeedsState() {
    try {
      const userId = await this.getCurrentUserId();
      
      const { data, error } = await supabase
        .from('user_feeds')
        .select('*')
        .eq('user_id', userId)
        .order('feed_category', { ascending: true });

      if (error) throw error;

      // If no feeds found, initialize them
      if (!data || data.length === 0) {
        await this.initializeUserFeeds();
        // Retry fetching
        const { data: retryData, error: retryError } = await supabase
          .from('user_feeds')
          .select('*')
          .eq('user_id', userId)
          .order('feed_category', { ascending: true });

        if (retryError) throw retryError;
        return this.formatFeedsResponse(retryData);
      }

      return this.formatFeedsResponse(data);
    } catch (error) {
      console.error('Error getting feeds state:', error);
      // Return default feeds as fallback
      return this.defaultFeeds;
    }
  }

  /**
   * Toggle feed enabled state
   */
  async toggleFeedState(feedKey) {
    try {
      const userId = await this.getCurrentUserId();
      
      // Get current state
      const { data: currentFeed, error: fetchError } = await supabase
        .from('user_feeds')
        .select('is_enabled')
        .eq('user_id', userId)
        .eq('feed_key', feedKey)
        .single();

      if (fetchError) throw fetchError;

      const newState = !currentFeed.is_enabled;

      // Update state
      const { error: updateError } = await supabase
        .from('user_feeds')
        .update({ 
          is_enabled: newState,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId)
        .eq('feed_key', feedKey);

      if (updateError) throw updateError;

      return newState;
    } catch (error) {
      console.error('Error toggling feed state:', error);
      throw error;
    }
  }

  // ... rest of the methods updated similarly ...

  /**
   * Format database response to match app structure
   */
  formatFeedsResponse(data) {
    if (!data) return [];
    
    return data.map(feed => ({
      id: feed.feed_key,
      feedKey: feed.feed_key,
      name: feed.feed_name,
      url: feed.feed_url,
      category: feed.feed_category,
      description: feed.feed_description,
      active: feed.is_enabled,
      isCustom: feed.is_custom,
      createdAt: feed.created_at,
      updatedAt: feed.updated_at
    }));
  }
}

export const feedStorageService = new FeedStorageService();
```

## Component Updates

### Update All Page Components
Remove userId prop from all components. For example:

#### File: `src/routes/(app)/feeds/+page.svelte`
```svelte
<script>
  import { onMount } from 'svelte';
  import { feedsStore } from '$lib/stores/feeds';
  import { feedStorageService } from '$lib/services/feedStorageService';
  import FeedsList from '$lib/components/FeedsList.svelte';
  import FeedManager from '$lib/components/FeedManager.svelte';
  
  // Remove: export let userId;
  
  let activeTab = 'all';
  let showManager = false;
  
  onMount(async () => {
    // Initialize feeds for new users
    await feedStorageService.initializeUserFeeds();
    // Load user feeds
    await feedsStore.loadUserFeeds();
    // Refresh feeds
    await feedsStore.refreshAll();
  });
  
  // ... rest of component
</script>
```

#### Update Component Imports
In components that need userId:
```svelte
<script>
  import { userId } from '$lib/stores/user';
  
  // Use $userId in the component instead of prop
  $: if ($userId) {
    // Load user-specific data
  }
</script>
```

## Migration & Cleanup

### File: `src/routes/(app)/migrate/+page.svelte`
Create a temporary migration page:

```svelte
<script>
  import { onMount } from 'svelte';
  import { supabase } from '$lib/supabase';
  import { user } from '$lib/stores/user';
  import { goto } from '$app/navigation';
  
  let migrating = false;
  let migrationStatus = [];
  let error = null;
  let oldUserId = null;
  
  onMount(() => {
    // Check for old localStorage userId
    oldUserId = localStorage.getItem('learningos_user_id');
    
    if (!oldUserId) {
      // No migration needed
      goto('/feeds');
    }
  });
  
  async function migrateData() {
    if (!$user || !oldUserId) return;
    
    migrating = true;
    migrationStatus = [];
    error = null;
    
    const tables = [
      { name: 'user_feeds', displayName: 'Feed Preferences' },
      { name: 'roadmap_progress', displayName: 'Roadmap Progress' },
      { name: 'user_progress', displayName: 'Stage Progress' },
      { name: 'daily_logs', displayName: 'Daily Logs' },
      { name: 'chat_sessions', displayName: 'Chat History' },
      { name: 'chat_messages', displayName: 'Chat Messages' }
    ];
    
    for (const table of tables) {
      try {
        migrationStatus = [...migrationStatus, { 
          table: table.displayName, 
          status: 'migrating' 
        }];
        
        // Check if data exists
        const { data: existingData, error: checkError } = await supabase
          .from(table.name)
          .select('id')
          .eq('user_id', oldUserId)
          .limit(1);
        
        if (checkError) throw checkError;
        
        if (existingData && existingData.length > 0) {
          // Migrate data
          const { error: updateError } = await supabase
            .from(table.name)
            .update({ user_id: $user.id })
            .eq('user_id', oldUserId);
            
          if (updateError) throw updateError;
          
          migrationStatus = migrationStatus.map(s => 
            s.table === table.displayName 
              ? { ...s, status: 'success' }
              : s
          );
        } else {
          migrationStatus = migrationStatus.map(s => 
            s.table === table.displayName 
              ? { ...s, status: 'skipped' }
              : s
          );
        }
      } catch (err) {
        console.error(`Error migrating ${table.name}:`, err);
        migrationStatus = migrationStatus.map(s => 
          s.table === table.displayName 
            ? { ...s, status: 'error', error: err.message }
            : s
        );
      }
    }
    
    // Clear old localStorage
    localStorage.removeItem('learningos_user_id');
    localStorage.removeItem('learningos_user_name');
    localStorage.removeItem('learningos_prefs');
    
    migrating = false;
    
    // Redirect after successful migration
    setTimeout(() => goto('/feeds'), 2000);
  }
  
  async function skipMigration() {
    // Clear old data
    localStorage.removeItem('learningos_user_id');
    localStorage.removeItem('learningos_user_name');
    localStorage.removeItem('learningos_prefs');
    
    goto('/feeds');
  }
</script>

<div class="max-w-2xl mx-auto p-8">
  <h1 class="text-2xl font-bold mb-6">Data Migration</h1>
  
  {#if oldUserId && $user}
    <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <p class="text-sm text-blue-800">
        We found data from your previous session. Would you like to migrate it to your new account?
      </p>
      <p class="text-xs text-blue-600 mt-2">
        Old ID: {oldUserId.slice(0, 8)}... → New ID: {$user.email}
      </p>
    </div>
    
    {#if migrationStatus.length > 0}
      <div class="space-y-2 mb-6">
        {#each migrationStatus as status}
          <div class="flex items-center justify-between p-3 bg-white rounded-lg border">
            <span class="font-medium">{status.table}</span>
            <span class="text-sm">
              {#if status.status === 'migrating'}
                <span class="text-yellow-600">Migrating...</span>
              {:else if status.status === 'success'}
                <span class="text-green-600">✓ Migrated</span>
              {:else if status.status === 'skipped'}
                <span class="text-gray-500">- No data</span>
              {:else if status.status === 'error'}
                <span class="text-red-600">✗ Error</span>
              {/if}
            </span>
          </div>
        {/each}
      </div>
    {/if}
    
    {#if error}
      <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
        <p class="text-sm text-red-800">{error}</p>
      </div>
    {/if}
    
    <div class="flex gap-4">
      <button
        on:click={migrateData}
        disabled={migrating}
        class="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50"
      >
        {migrating ? 'Migrating...' : 'Migrate My Data'}
      </button>
      
      <button
        on:click={skipMigration}
        disabled={migrating}
        class="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
      >
        Skip & Start Fresh
      </button>
    </div>
  {:else}
    <p class="text-gray-600">No migration needed. Redirecting...</p>
  {/if}
</div>
```

## Environment Configuration

### File: `.env`
Update your environment variables:
```env
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### File: `src/app.html`
Update to handle auth state during SSR:
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <link rel="icon" href="%sveltekit.assets%/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="description" content="ClearMind - Your sanctuary for focused learning" />
    %sveltekit.head%
  </head>
  <body data-sveltekit-preload-data="hover">
    <div style="display: contents">%sveltekit.body%</div>
  </body>
</html>
```

## Final Steps

### 1. Update Redirect Rules
After deploying, check for the migration route on first login:
```javascript
// In authStore, after successful login
if (browser && localStorage.getItem('learningos_user_id')) {
  goto('/migrate');
} else {
  goto('/feeds');
}
```

### 2. Remove Old Code
After migration period:
- Remove migration page
- Remove localStorage checks
- Remove userId props from all components

### 3. Update TypeScript (if using)
```typescript
// types/auth.ts
export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
}

export interface AuthState {
  user: AuthUser | null;
  session: any | null;
  loading: boolean;
  initialized: boolean;
  error: string | null;
}
```

## Testing Checklist

### Auth Flows
- [ ] Sign up with email/password
- [ ] Email confirmation
- [ ] Sign in with email/password
- [ ] Magic link sign in
- [ ] Sign out
- [ ] Session persistence
- [ ] Token refresh

### Protected Routes
- [ ] Redirect to login when not authenticated
- [ ] Access feeds after login
- [ ] Access roadmap after login
- [ ] Access tracker after login
- [ ] Chat panel requires auth

### Data Access
- [ ] Feeds load for authenticated user
- [ ] Roadmap progress saves correctly
- [ ] Daily logs are user-specific
- [ ] Chat sessions are isolated

### Migration
- [ ] Old localStorage data detected
- [ ] Migration completes successfully
- [ ] Skip migration works
- [ ] No data loss

### Edge Cases
- [ ] Invalid credentials show error
- [ ] Network errors handled gracefully
- [ ] Session expiry handled
- [ ] Multiple tabs sync auth state

## Troubleshooting

### Common Issues

1. **Auth state not updating**: Check auth listener setup
2. **Redirect loops**: Verify route protection logic
3. **Data not loading**: Check RLS policies
4. **Migration fails**: Verify table permissions

### Debug Helpers
```javascript
// Add to stores for debugging
window.debugAuth = () => {
  console.log('Auth state:', get(authStore));
  console.log('User:', get(user));
  console.log('UserId:', get(userId));
};
```

## Summary

This implementation:
- ✅ Replaces localStorage with Supabase Auth
- ✅ Adds secure email/password authentication
- ✅ Includes magic link support
- ✅ Protects all routes
- ✅ Updates all stores and services
- ✅ Handles data migration
- ✅ Maintains the zen philosophy

The app now has proper authentication while keeping the calm, focused interface intact. Users can access their learning sanctuary from any device with their credentials.