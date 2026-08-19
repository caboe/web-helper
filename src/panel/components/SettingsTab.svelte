<script lang="ts">
  import EndpointsTab from './EndpointsTab.svelte'
  import PromptsTab from './PromptsTab.svelte'
  import type { Endpoint, SystemPrompt } from '../../shared/types'

  let { endpoints, prompts, onEndpointsChange, onPromptsChange } = $props<{
    endpoints: Endpoint[]
    prompts: SystemPrompt[]
    onEndpointsChange: (list: Endpoint[]) => void
    onPromptsChange: (list: SystemPrompt[]) => void
  }>()

  type SubTab = 'endpoints' | 'prompts'
  let sub = $state<SubTab>('endpoints')
</script>

<div class="flex flex-col">
  <!-- Unter-Navigation -->
  <div class="sticky top-0 z-10 border-b border-zinc-200/70 bg-[#fafaf9]/90 px-4 pb-3 pt-3 backdrop-blur">
    <div class="flex rounded-full bg-zinc-200/60 p-1">
      <button
        type="button"
        onclick={() => (sub = 'endpoints')}
        class:bg-white={sub === 'endpoints'}
        class:shadow-sm={sub === 'endpoints'}
        class:text-zinc-900={sub === 'endpoints'}
        class:text-zinc-500={sub !== 'endpoints'}
        class="flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition"
      >
        Endpunkte
      </button>
      <button
        type="button"
        onclick={() => (sub = 'prompts')}
        class:bg-white={sub === 'prompts'}
        class:shadow-sm={sub === 'prompts'}
        class:text-zinc-900={sub === 'prompts'}
        class:text-zinc-500={sub !== 'prompts'}
        class="flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition"
      >
        Prompts
      </button>
    </div>
  </div>

  {#if sub === 'endpoints'}
    <EndpointsTab {endpoints} onChange={onEndpointsChange} />
  {:else}
    <PromptsTab {prompts} onChange={onPromptsChange} />
  {/if}
</div>
