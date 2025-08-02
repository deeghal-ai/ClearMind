import { writable } from 'svelte/store';
import { chatPanel } from './chatPanel.js';

function createNavigationStore() {
  const { subscribe, set, update } = writable({
    currentTab: 'feeds'
  });

  return {
    subscribe,
    
    setTab(tabId) {
      update(state => ({ ...state, currentTab: tabId }));
    },
    
    // Updated to open chat panel instead of navigating to chat tab
    navigateToChat() {
      chatPanel.open();
    }
  };
}

export const navigation = createNavigationStore();