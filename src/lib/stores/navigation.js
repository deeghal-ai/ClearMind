import { writable } from 'svelte/store';

function createNavigationStore() {
  const { subscribe, set, update } = writable({
    currentTab: 'feeds'
  });

  return {
    subscribe,
    
    setTab(tabId) {
      update(state => ({ ...state, currentTab: tabId }));
    },
    
    navigateToChat() {
      update(state => ({ ...state, currentTab: 'chat' }));
    }
  };
}

export const navigation = createNavigationStore();