<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { authStore } from '$lib/stores/user';
  
  onMount(() => {
    // Initialize auth store if not already done
    authStore.init();
    
    // Supabase will handle the callback automatically through the auth listener
    // Just redirect to the main app after a short delay
    setTimeout(() => {
      goto('/feeds');
    }, 1000);
  });
</script>

<svelte:head>
  <title>ClearMind - Signing In</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center">
  <div class="text-center">
    <div class="inline-flex items-center justify-center w-20 h-20 bg-teal-600 rounded-2xl mb-4">
      <span class="text-4xl">🧠</span>
    </div>
    <h1 class="text-2xl font-bold text-gray-900 mb-2">ClearMind</h1>
    <div class="flex items-center justify-center space-x-2 text-gray-600">
      <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-teal-600"></div>
      <p>Signing you in...</p>
    </div>
  </div>
</div>