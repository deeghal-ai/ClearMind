<script>
  import { createEventDispatcher } from 'svelte';
  
  export let goals = [];
  export let completedGoals = [];
  export let loading = false;
  
  const dispatch = createEventDispatcher();
  
  let newGoal = '';
  let editingIndex = -1;
  let editingText = '';
  
  function addGoal() {
    if (!newGoal.trim()) return;
    
    dispatch('addGoal', { goal: newGoal.trim() });
    newGoal = '';
  }
  
  function removeGoal(index) {
    dispatch('removeGoal', { index });
  }
  
  function toggleGoal(goal) {
    dispatch('toggleGoal', { goal });
  }
  
  function startEditing(index, text) {
    editingIndex = index;
    editingText = text;
  }
  
  function saveEdit() {
    if (editingText.trim() && editingText !== goals[editingIndex]) {
      // Remove old goal and add new one
      dispatch('removeGoal', { index: editingIndex });
      setTimeout(() => {
        dispatch('addGoal', { goal: editingText.trim() });
      }, 100);
    }
    cancelEdit();
  }
  
  function cancelEdit() {
    editingIndex = -1;
    editingText = '';
  }
  
  function handleKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (editingIndex >= 0) {
        saveEdit();
      } else {
        addGoal();
      }
    } else if (e.key === 'Escape') {
      if (editingIndex >= 0) {
        cancelEdit();
      }
    }
  }
  
  // Clean up completed goals that no longer exist in goals array
  $: cleanCompletedGoals = completedGoals.filter(completed => goals.includes(completed));
  $: completionRate = goals.length > 0 ? (cleanCompletedGoals.length / goals.length) * 100 : 0;
</script>

<div class="goal-input-container">
  <!-- Progress Header -->
  <div class="mb-6">
    <div class="flex items-center justify-between mb-2">
      <h3 class="text-lg font-semibold text-zen-gray-800">Today's Goals</h3>
      <div class="text-sm text-zen-gray-600">
        {cleanCompletedGoals.length} of {goals.length} completed
      </div>
    </div>
    
    {#if goals.length > 0}
      <div class="w-full bg-zen-gray-200 rounded-full h-2">
        <div 
          class="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full transition-all duration-300"
          style="width: {completionRate}%"
        ></div>
      </div>
      <div class="text-xs text-zen-gray-500 mt-1">{Math.round(completionRate)}% complete</div>
    {/if}
  </div>

  <!-- Add Goal Input -->
  <div class="mb-4">
    <div class="flex gap-2">
      <input
        bind:value={newGoal}
        on:keydown={handleKeydown}
        placeholder="Add a learning goal for today..."
        disabled={loading}
        class="flex-1 px-4 py-2 border border-zen-gray-300 rounded-lg
               focus:outline-none focus:ring-2 focus:ring-blue-500
               disabled:opacity-50 disabled:cursor-not-allowed"
      />
      <button
        on:click={addGoal}
        disabled={!newGoal.trim() || loading}
        class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600
               disabled:opacity-50 disabled:cursor-not-allowed
               flex items-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Add
      </button>
    </div>
    <div class="text-xs text-zen-gray-500 mt-1">
      Press Enter to add • Be specific and actionable
    </div>
  </div>

  <!-- Goals List -->
  <div class="space-y-2">
    {#each goals as goal, index}
      <div class="goal-item group flex items-start gap-3 p-3 bg-white border border-zen-gray-200 rounded-lg hover:border-zen-gray-300 transition-colors">
        <!-- Checkbox -->
        <button
          on:click={() => toggleGoal(goal)}
          class="flex-shrink-0 w-6 h-6 mt-0.5 rounded-full border-2 flex items-center justify-center transition-colors
                 {cleanCompletedGoals.includes(goal) 
                   ? 'bg-green-500 border-green-500 text-white' 
                   : 'border-zen-gray-300 hover:border-green-400'}"
        >
          {#if cleanCompletedGoals.includes(goal)}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          {/if}
        </button>

        <!-- Goal Text / Edit Input -->
        <div class="flex-1 min-w-0">
          {#if editingIndex === index}
            <input
              bind:value={editingText}
              on:keydown={handleKeydown}
              on:blur={saveEdit}
              class="w-full px-2 py-1 border border-blue-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              autocomplete="off"
            />
          {:else}
            <div 
              class="break-words hyphens-auto leading-relaxed {cleanCompletedGoals.includes(goal) ? 'line-through text-zen-gray-500' : 'text-zen-gray-800'}"
              title={goal}
            >
              {goal}
            </div>
          {/if}
        </div>

        <!-- Actions -->
        <div class="flex items-start gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          {#if editingIndex === index}
            <button
              on:click={saveEdit}
              class="p-1 text-green-600 hover:bg-green-50 rounded"
              title="Save"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
            </button>
            <button
              on:click={cancelEdit}
              class="p-1 text-zen-gray-400 hover:bg-zen-gray-50 rounded"
              title="Cancel"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {:else}
            <button
              on:click={() => startEditing(index, goal)}
              class="p-1 text-zen-gray-400 hover:bg-zen-gray-50 rounded"
              title="Edit goal"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              on:click={() => removeGoal(index)}
              class="p-1 text-red-400 hover:bg-red-50 rounded"
              title="Remove goal"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          {/if}
        </div>
      </div>
    {/each}

    {#if goals.length === 0}
      <div class="text-center py-8 text-zen-gray-500">
        <div class="text-4xl mb-2">🎯</div>
        <p class="text-sm">No goals set for today</p>
        <p class="text-xs mt-1">Add your first learning goal to get started!</p>
      </div>
    {/if}
  </div>

  <!-- Motivational Footer -->
  {#if goals.length > 0}
    <div class="mt-4 p-3 bg-blue-50 rounded-lg">
      {#if completionRate === 100}
        <div class="text-center text-blue-800">
          <div class="text-2xl mb-1">🎉</div>
          <p class="font-medium text-sm">Amazing! All goals completed!</p>
          <p class="text-xs">You're building great learning habits.</p>
        </div>
      {:else if completionRate >= 50}
        <div class="text-center text-blue-700">
          <div class="text-xl mb-1">💪</div>
          <p class="text-sm">Great progress! Keep it up.</p>
        </div>
      {:else if completedGoals.length > 0}
        <div class="text-center text-blue-600">
          <div class="text-xl mb-1">🚀</div>
          <p class="text-sm">Good start! You got this.</p>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .goal-item {
    animation: slideIn 0.2s ease-out;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
</style>