import { writable } from 'svelte/store';

function createChatPanelStore() {
  const { subscribe, set, update } = writable({
    isOpen: false,
    width: 380, // Default width in pixels
    activeView: 'chat', // 'chat' | 'history'
    isHistoryExpanded: false,
    pendingContext: null // For context passed from other components
  });

  return {
    subscribe,
    toggle: () => update(state => ({ ...state, isOpen: !state.isOpen })),
    open: () => update(state => ({ ...state, isOpen: true })),
    close: () => update(state => ({ ...state, isOpen: false })),
    setWidth: (width) => update(state => ({ ...state, width })),
    toggleHistory: () => update(state => ({ 
      ...state, 
      isHistoryExpanded: !state.isHistoryExpanded 
    })),
    // New method to open with context
    openWithContext: (context) => update(state => ({ 
      ...state, 
      isOpen: true, 
      pendingContext: context 
    })),
    clearPendingContext: () => update(state => ({ 
      ...state, 
      pendingContext: null 
    }))
  };
}

export const chatPanel = createChatPanelStore();