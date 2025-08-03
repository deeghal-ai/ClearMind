// Simple event bus to avoid circular dependencies
import { writable } from 'svelte/store';

function createEventBus() {
  const { subscribe, set, update } = writable([]);

  return {
    subscribe,
    
    // Emit an event
    emit(eventType, data) {
      update(events => [...events, { type: eventType, data, timestamp: Date.now() }]);
    },
    
    // Clear events (optional, for cleanup)
    clear() {
      set([]);
    }
  };
}

export const eventBus = createEventBus();

// Event types
export const EVENTS = {
  ROADMAP_PROGRESS: 'roadmap_progress'
};