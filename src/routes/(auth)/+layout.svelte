<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore, isAuthenticated } from '$lib/stores/user';

  onMount(() => {
    // Initialize auth store
    authStore.init();
    
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