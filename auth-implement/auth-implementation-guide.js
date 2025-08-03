// SUPABASE AUTH IMPLEMENTATION GUIDE FOR AI AGENT
// =============================================
// Follow these steps in order. Each section is self-contained.

// STEP 1: Install Dependencies
// ----------------------------
// Run in terminal:
// npm install @supabase/auth-helpers-sveltekit

// STEP 2: Create Auth Service
// ---------------------------
// File: src/lib/services/auth.js

import { supabase } from '$lib/supabase';
import { goto } from '$app/navigation';

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
      return { success: true, data, message: 'Check your email to confirm your account!' };
    } catch (error) {
      return { success: false, error: error.message };
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
      return { success: false, error: error.message };
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
      return { success: true, message: 'Check your email for the magic link!' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear any app-specific storage
      localStorage.removeItem('learningos_user_id');
      localStorage.removeItem('learningos_user_name');
      
      // Redirect to login
      await goto('/login');
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  async getUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  }
};

// STEP 3: Update User Store
// -------------------------
// File: src/lib/stores/user.js

import { writable, derived } from 'svelte/store';
import { supabase } from '$lib/supabase';
import { browser } from '$app/environment';

function createAuthStore() {
  const { subscribe, set } = writable({
    user: null,
    session: null,
    loading: true,
    initialized: false
  });

  let authListener = null;

  return {
    subscribe,
    
    async init() {
      if (!browser) return;

      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        set({
          user: session?.user ?? null,
          session: session ?? null,
          loading: false,
          initialized: true
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, session) => {
            console.log('Auth event:', event);
            
            set({
              user: session?.user ?? null,
              session: session ?? null,
              loading: false,
              initialized: true
            });

            // Handle auth events
            if (event === 'SIGNED_IN') {
              console.log('User signed in:', session.user.email);
            } else if (event === 'SIGNED_OUT') {
              console.log('User signed out');
            } else if (event === 'TOKEN_REFRESHED') {
              console.log('Token refreshed');
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
          initialized: true
        });
      }
    },

    cleanup() {
      if (authListener) {
        authListener.unsubscribe();
        authListener = null;
      }
    }
  };
}

// Create store instances
export const authStore = createAuthStore();
export const user = derived(authStore, $auth => $auth.user);
export const userId = derived(user, $user => $user?.id ?? null);
export const userEmail = derived(user, $user => $user?.email ?? null);
export const isAuthenticated = derived(authStore, $auth => !!$auth.user);

// STEP 4: Create Auth Layout Group
// --------------------------------
// Create these directories and files:
// src/routes/(auth)/
// src/routes/(auth)/+layout.svelte

// File: src/routes/(auth)/+layout.svelte
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore, isAuthenticated } from '$lib/stores/user';

  onMount(() => {
    // Redirect if already authenticated
    const unsubscribe = isAuthenticated.subscribe(authenticated => {
      if (authenticated) {
        goto('/feeds');
      }
    });

    return unsubscribe;
  });
</script>

<slot />

// STEP 5: Create Login Page Component
// -----------------------------------
// File: src/routes/(auth)/login/+page.svelte

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
      } else {
        // Redirect on successful login
        await goto('/feeds');
      }
    } else {
      error = result.error;
    }
    
    loading = false;
  }

  async function handleMagicLink() {
    loading = true;
    error = null;
    success = null;

    const result = await authService.signInWithMagicLink(email);
    
    if (result.success) {
      success = result.message;
    } else {
      error = result.error;
    }
    
    loading = false;
  }

  function toggleMode() {
    isSignUp = !isSignUp;
    error = null;
    success = null;
  }
</script>

// [Login page HTML template - see the markdown artifact for full template]

// STEP 6: Update App Layout
// ------------------------
// File: src/routes/(app)/+layout.svelte

<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore, isAuthenticated } from '$lib/stores/user';
  
  onMount(() => {
    // Protect routes - redirect to login if not authenticated
    const unsubscribe = authStore.subscribe($auth => {
      if ($auth.initialized && !$auth.user) {
        goto('/login');
      }
    });

    return unsubscribe;
  });
</script>

{#if $authStore.loading}
  <div class="min-h-screen flex items-center justify-center">
    <div class="text-5xl">🧠</div>
  </div>
{:else if $isAuthenticated}
  <!-- Your existing app layout here -->
  <slot />
{/if}

// STEP 7: Update Service Calls
// ----------------------------
// Example: Update feed service to use auth user

// Before:
async function loadFeeds(userId) {
  const { data, error } = await supabase
    .from('feeds')
    .select('*')
    .eq('user_id', userId);
}

// After:
async function loadFeeds() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  const { data, error } = await supabase
    .from('feeds')
    .select('*')
    .eq('user_id', user.id);
}

// STEP 8: Update Component Props
// ------------------------------
// Remove userId props from components

// Before:
<FeedsList {userId} />

// After:
<FeedsList />

// Inside FeedsList component:
import { userId } from '$lib/stores/user';
// Use $userId directly in the component

// STEP 9: Database Migration (if needed)
// -------------------------------------
// If you have existing data with old userIds:

async function migrateUserData() {
  const oldUserId = localStorage.getItem('learningos_user_id');
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!oldUserId || !user) return;
  
  console.log(`Migrating data from ${oldUserId} to ${user.id}`);
  
  // Update each table
  const tables = [
    'user_feeds',
    'roadmap_progress', 
    'user_progress',
    'daily_logs',
    'chat_sessions',
    'chat_messages'
  ];
  
  for (const table of tables) {
    const { error } = await supabase
      .from(table)
      .update({ user_id: user.id })
      .eq('user_id', oldUserId);
      
    if (error) {
      console.error(`Error migrating ${table}:`, error);
    } else {
      console.log(`✓ Migrated ${table}`);
    }
  }
  
  // Clear old localStorage
  localStorage.removeItem('learningos_user_id');
  localStorage.removeItem('learningos_user_name');
}

// STEP 10: Test Your Implementation
// --------------------------------
// Test these flows:

// 1. Sign Up Flow
// - Create new account
// - Check email for confirmation
// - Confirm email
// - Auto-login after confirmation

// 2. Sign In Flow  
// - Login with email/password
// - Login with magic link
// - Handle wrong credentials

// 3. Protected Routes
// - Try accessing /feeds without auth (should redirect)
// - Login and verify access

// 4. Sign Out
// - Click sign out
// - Verify redirect to login
// - Verify cannot access protected routes

// 5. Session Persistence
// - Login
// - Refresh page
// - Verify still logged in

// TROUBLESHOOTING TIPS
// --------------------
// 1. If auth state not updating:
//    - Check Supabase URL and anon key
//    - Verify auth listener is set up
//    - Check browser console for errors

// 2. If redirect loops occur:
//    - Check route groups (auth) vs (app)
//    - Verify layout protection logic

// 3. If data not loading after auth:
//    - Check RLS policies in Supabase
//    - Verify user.id is being used correctly
//    - Check service account permissions