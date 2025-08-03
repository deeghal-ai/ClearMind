import { supabase } from '../supabase.js';

// Browser detection and navigation for traditional Svelte app
const browser = typeof window !== 'undefined';

function goto(path) {
  if (browser) {
    window.history.pushState({}, '', path);
    // Trigger a popstate event to update the router
    window.dispatchEvent(new PopStateEvent('popstate'));
  }
}

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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Clear any app-specific storage
      if (browser) {
        localStorage.removeItem('learningos_user_id');
        localStorage.removeItem('learningos_user_name');
      }
      
      // Redirect to login
      await goto('/login');
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
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  },

  async getSession() {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  // Helper function for handling auth errors with user-friendly messages
  handleAuthError(error) {
    if (error.message.includes('Email not confirmed')) {
      return 'Please check your email to confirm your account';
    }
    if (error.message.includes('Invalid login credentials')) {
      return 'Invalid email or password';
    }
    if (error.message.includes('User not found')) {
      return 'No account found with this email';
    }
    if (error.message.includes('Email rate limit exceeded')) {
      return 'Too many requests. Please wait before trying again';
    }
    return 'An error occurred. Please try again.';
  },

  // Migration utility: Migrate data from localStorage user to authenticated user
  async migrateUserData() {
    const oldUserId = localStorage.getItem('learningos_user_id');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!oldUserId || !user || oldUserId === user.id) return;
    
    console.log(`🔄 Migrating data from ${oldUserId} to ${user.id}`);
    
    // List of tables to migrate
    const tables = [
      'user_feeds',
      'roadmap_progress', 
      'user_progress',
      'daily_logs',
      'chat_sessions',
      'chat_messages'
    ];
    
    try {
      for (const table of tables) {
        const { error } = await supabase
          .from(table)
          .update({ user_id: user.id })
          .eq('user_id', oldUserId);
          
        if (error) {
          console.error(`❌ Error migrating ${table}:`, error);
        } else {
          console.log(`✅ Migrated ${table}`);
        }
      }
      
      // Clear old localStorage after successful migration
      localStorage.removeItem('learningos_user_id');
      localStorage.removeItem('learningos_user_name');
      
      console.log('✅ Migration completed successfully');
      return { success: true };
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return { success: false, error: error.message };
    }
  }
};