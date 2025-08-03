<script>
  import { authService } from '$lib/services/auth';
  import { goto } from '$app/navigation';
  
  let email = '';
  let password = '';
  let isSignUp = false;
  let loading = false;
  let error = null;
  let success = null;
  let usePasswordMode = true;

  async function handlePasswordAuth() {
    loading = true;
    error = null;
    success = null;

    const result = isSignUp 
      ? await authService.signUp(email, password)
      : await authService.signIn(email, password);

    if (result.success) {
      if (isSignUp) {
        success = result.message;
      } else {
        // Redirect on successful login
        await goto('/feeds');
      }
    } else {
      error = authService.handleAuthError({ message: result.error });
    }
    
    loading = false;
  }

  async function handleMagicLink() {
    loading = true;
    error = null;
    success = null;

    const result = await authService.signInWithMagicLink(email);
    
    if (result.success) {
      success = result.message;
    } else {
      error = authService.handleAuthError({ message: result.error });
    }
    
    loading = false;
  }

  function toggleMode() {
    isSignUp = !isSignUp;
    error = null;
    success = null;
  }
</script>

<svelte:head>
  <title>ClearMind - {isSignUp ? 'Sign Up' : 'Sign In'}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-teal-50 to-teal-100 flex items-center justify-center p-4">
  <div class="max-w-md w-full">
    <!-- Logo and Title -->
    <div class="text-center mb-8">
      <div class="inline-flex items-center justify-center w-20 h-20 bg-teal-600 rounded-2xl mb-4">
        <span class="text-4xl">🧠</span>
      </div>
      <h1 class="text-3xl font-bold text-gray-900">ClearMind</h1>
      <p class="text-gray-600 mt-2">Your sanctuary for focused learning</p>
    </div>

    <!-- Auth Form -->
    <div class="bg-white rounded-2xl shadow-xl p-8">
      {#if success}
        <div class="text-center">
          <div class="text-5xl mb-4">📧</div>
          <h2 class="text-xl font-semibold mb-2">Check your email!</h2>
          <p class="text-gray-600">{success}</p>
          {#if isSignUp}
            <button
              on:click={() => { success = null; isSignUp = false; }}
              class="mt-4 text-teal-600 hover:text-teal-500 font-medium"
            >
              Back to Sign In
            </button>
          {/if}
        </div>
      {:else}
        <form on:submit|preventDefault={handlePasswordAuth} class="space-y-6">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              bind:value={email}
              required
              class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>

          {#if usePasswordMode}
            <div>
              <label for="password" class="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                bind:value={password}
                required
                class="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="••••••••"
                minlength="6"
              />
            </div>
          {/if}

          {#if error}
            <div class="text-red-600 text-sm text-center bg-red-50 p-3 rounded-lg">{error}</div>
          {/if}

          {#if usePasswordMode}
            <button
              type="submit"
              disabled={loading || !email || !password}
              class="w-full py-3 px-4 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : (isSignUp ? 'Sign Up' : 'Sign In')}
            </button>

            <div class="relative">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-gray-300"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-2 bg-white text-gray-500">Or</span>
              </div>
            </div>

            <button
              type="button"
              on:click={() => usePasswordMode = false}
              class="w-full py-3 px-4 bg-white text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 transition-colors"
            >
              Use Magic Link Instead
            </button>
          {:else}
            <button
              type="button"
              on:click={handleMagicLink}
              disabled={loading || !email}
              class="w-full py-3 px-4 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending...' : 'Send Magic Link'}
            </button>

            <button
              type="button"
              on:click={() => usePasswordMode = true}
              class="w-full py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              Use Password Instead
            </button>
          {/if}
        </form>

        {#if usePasswordMode}
          <p class="mt-6 text-center text-sm text-gray-600">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            <button
              on:click={toggleMode}
              class="font-medium text-teal-600 hover:text-teal-500"
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </button>
          </p>
        {/if}
      {/if}
    </div>

    <!-- Footer -->
    <div class="text-center mt-8 text-sm text-gray-500">
      <p>Experience calm, focused learning</p>
    </div>
  </div>
</div>