import { writable } from 'svelte/store';

function createUserStore() {
  const { subscribe, set, update } = writable({
    id: '',
    name: 'Learner',
    initialized: false
  });

  return {
    subscribe,
    
    init() {
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

export const user = createUserStore();