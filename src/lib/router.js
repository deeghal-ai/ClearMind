import { writable } from 'svelte/store';

function createRouter() {
  const { subscribe, set } = writable({
    path: window.location.pathname,
    params: new URLSearchParams(window.location.search)
  });

  function navigate(path) {
    window.history.pushState({}, '', path);
    set({
      path,
      params: new URLSearchParams(window.location.search)
    });
  }

  function handlePopState() {
    set({
      path: window.location.pathname,
      params: new URLSearchParams(window.location.search)
    });
  }

  // Listen for back/forward navigation
  if (typeof window !== 'undefined') {
    window.addEventListener('popstate', handlePopState);
  }

  return {
    subscribe,
    navigate,
    cleanup: () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('popstate', handlePopState);
      }
    }
  };
}

export const router = createRouter();