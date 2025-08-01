import { writable, derived, get } from 'svelte/store';
import { supabase } from '../supabase.js';
import { openaiChat } from '../openai.js';
import { ContextProvider } from '../contextProvider.js';

function createChatStore() {
  const { subscribe, set, update } = writable({
    sessions: [],
    currentSession: null,
    messages: [],
    loading: false,
    streaming: false,
    error: null
  });

  // Context provider instance
  let contextProvider = null;
  
  const store = {
    subscribe,

    // Initialize context provider with user data
    initContext(userId, trackerData = null) {
      if (contextProvider && contextProvider.userId === userId) {
        console.log('✅ DEBUG: ContextProvider already exists for this user, skipping recreation');
        if (trackerData) {
          contextProvider.setLearningState(trackerData);
        }
        return;
      }
      
      console.log('🔍 DEBUG: Creating new ContextProvider for user:', userId);
      contextProvider = new ContextProvider(userId);
      if (trackerData) {
        console.log('🔍 DEBUG: Setting initial tracker data:', trackerData);
        contextProvider.setLearningState(trackerData);
      }
    },

    // Update learning state for intelligent context
    updateLearningState(trackerData) {
      if (contextProvider) {
        contextProvider.setLearningState(trackerData);
      }
    },
    
    async loadSessions(userId) {
      update(s => ({ ...s, loading: true }));
      
      try {
        const { data, error } = await supabase
          .from('chat_sessions')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        
        update(s => ({ 
          ...s, 
          sessions: data || [],
          loading: false 
        }));
      } catch (error) {
        update(s => ({ ...s, error: error.message, loading: false }));
      }
    },
    
    async createSession(userId, contextType = 'general', contextData = {}) {
      try {
        const { data, error } = await supabase
          .from('chat_sessions')
          .insert({
            user_id: userId,
            context_type: contextType,
            context_data: contextData,
            title: null
          })
          .select()
          .single();
        
        if (error) throw error;
        
        update(s => ({
          ...s,
          currentSession: data,
          messages: [],
          sessions: [data, ...s.sessions]
        }));
        
        return data;
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
      let state = get(chatStore);
      let currentSession = state.currentSession;
      
      // Create session if none exists
      if (!currentSession) {
        console.log('🔍 DEBUG: No current session, creating new one...');
        currentSession = await store.createSession(userId);
        if (!currentSession) {
          console.error('🚨 DEBUG: Failed to create session');
          return;
        }
        console.log('✅ DEBUG: Session created:', currentSession);
      }
      
      // Add user message to UI
      const userMessage = {
        id: Date.now(),
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
      try {
        await supabase
          .from('chat_messages')
          .insert({
            session_id: currentSession.id,
            role: 'user',
            content: message
          });
      } catch (error) {
        console.error('Error saving user message:', error);
      }
      
      // Get AI response
      try {
        const sessionContextType = currentSession?.context_type || 'general';
        const sessionContextData = currentSession?.context_data || {};
        const currentMessages = get(chatStore).messages;
        
        // Generate intelligent system prompt using context provider
        let systemPrompt = "You are a helpful AI learning assistant.";
        if (contextProvider) {
          systemPrompt = contextProvider.generateIntelligentSystemPrompt(
            sessionContextType, 
            sessionContextData
          );
        }
        
        // Add empty assistant message for streaming effect
        const assistantMessage = {
          id: Date.now() + 1,
          role: 'assistant',
          content: '',
          created_at: new Date().toISOString()
        };
        
        update(s => ({
          ...s,
          messages: [...s.messages, assistantMessage]
        }));
        
        // Stream the response with intelligent context
        for await (const chunk of openaiChat.streamResponse(currentMessages, { systemPrompt })) {
          assistantMessage.content = chunk;
          update(s => ({
            ...s,
            messages: [...s.messages.slice(0, -1), { ...assistantMessage }]
          }));
        }
        
        // Save assistant message to DB
        await supabase
          .from('chat_messages')
          .insert({
            session_id: currentSession.id,
            role: 'assistant',
            content: assistantMessage.content
          });
        
        // Generate title if first message
        if (currentMessages.length === 1) {
          const title = message.length > 50 ? message.substring(0, 50) + '...' : message;
          await supabase
            .from('chat_sessions')
            .update({ title })
            .eq('id', currentSession.id);
        }
        
        update(s => ({ ...s, streaming: false }));
        
      } catch (error) {
        update(s => ({ 
          ...s, 
          error: error.message, 
          streaming: false 
        }));
      }
    },
    
    async deleteSession(sessionId) {
      try {
        const { error } = await supabase
          .from('chat_sessions')
          .delete()
          .eq('id', sessionId);
        
        if (error) throw error;
        
        update(s => ({
          ...s,
          sessions: s.sessions.filter(session => session.id !== sessionId),
          currentSession: s.currentSession?.id === sessionId ? null : s.currentSession,
          messages: s.currentSession?.id === sessionId ? [] : s.messages
        }));
        
        return true;
      } catch (error) {
        update(s => ({ ...s, error: error.message }));
        return false;
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
  
  return store;
}

export const chatStore = createChatStore();

// Derived store for current context
export const currentContext = derived(
  chatStore,
  $store => $store.currentSession?.context_data || {}
);