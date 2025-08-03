import { writable, derived } from 'svelte/store';
import { supabase } from '../supabase.js';

// Browser detection for traditional Svelte app
const browser = typeof window !== 'undefined';

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
      
      // Prevent multiple initializations
      if (authListener) {
        console.log('Auth already initialized, skipping');
        return;
      }

      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        console.log('Initial session loaded:', session?.user?.email || 'No session');
        
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

// Legacy user store function for backward compatibility during migration
function createLegacyUserStore() {
  const { subscribe, set, update } = writable({
    id: '',
    name: 'Learner',
    initialized: false
  });

  return {
    subscribe,
    
    init() {
      // Check if we have auth user first
      const currentAuth = authStore;
      
      // If we have auth user, use that
      if (currentAuth && typeof currentAuth.subscribe === 'function') {
        const unsubscribe = currentAuth.subscribe($auth => {
          if ($auth.user) {
            update(u => ({
              ...u,
              id: $auth.user.id,
              name: $auth.user.email?.split('@')[0] || 'Learner',
              initialized: true
            }));
          } else if ($auth.initialized) {
            // No longer auto-create legacy users - require authentication
            console.log('No authenticated user, legacy user disabled');
            update(u => ({
              ...u,
              id: '',
              name: 'Learner',
              initialized: true
            }));
          }
        });
        return unsubscribe;
      } else {
        // No longer auto-create legacy users
        console.log('Auth not available, legacy user disabled');
        set({
          id: '',
          name: 'Learner',
          initialized: true
        });
      }
    },
    
    initLegacy() {
      // Get or create a user ID for session persistence
      let userId = localStorage.getItem('learningos_user_id');
      
      if (!userId) {
        // Create a simple user ID based on timestamp and random number
        userId = 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('learningos_user_id', userId);
      }
      
      let userName = localStorage.getItem('learningos_user_name') || 'Learner';
      
      update(u => ({
        ...u,
        id: userId,
        name: userName,
        initialized: true
      }));
    },
    
    setName(name) {
      localStorage.setItem('learningos_user_name', name);
      update(u => ({ ...u, name }));
    },
    
    reset() {
      localStorage.removeItem('learningos_user_id');
      localStorage.removeItem('learningos_user_name');
      update(u => ({
        id: '',
        name: 'Learner',
        initialized: false
      }));
    }
  };
}

// Create store instances
export const authStore = createAuthStore();
export const user = derived(authStore, $auth => $auth.user);
export const userId = derived(user, $user => $user?.id ?? null);
export const userEmail = derived(user, $user => $user?.email ?? null);
export const isAuthenticated = derived(authStore, $auth => !!$auth.user);

// Legacy user store for backward compatibility
export const legacyUser = createLegacyUserStore();