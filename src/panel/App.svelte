<script lang="ts">
  import { onMount } from 'svelte'
  import SendTab from './components/SendTab.svelte'
  import EndpointsTab from './components/EndpointsTab.svelte'
  import PromptsTab from './components/PromptsTab.svelte'
  import { loadEndpoints, loadPrompts, saveEndpoints, savePrompts } from './lib/storage'
  import type { Endpoint, SystemPrompt } from '../shared/types'

  type TabId = 'send' | 'endpoints' | 'prompts'

  let activeTab: TabId = $state<TabId>('send')
  let endpoints: Endpoint[] = $state([])
  let prompts: SystemPrompt[] = $state([])

  onMount(async () => {
    const [e, p] = await Promise.all([loadEndpoints(), loadPrompts()])
    endpoints = e
    prompts = p
  })

  function onEndpointsChange(list: Endpoint[]) {
    endpoints = list
    saveEndpoints(list)
  }

  function onPromptsChange(list: SystemPrompt[]) {
    prompts = list
    savePrompts(list)
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'send', label: 'Senden' },
    { id: 'endpoints', label: 'Endpunkte' },
    { id: 'prompts', label: 'Prompts' },
  ]
</script>

<div class="flex h-full flex-col bg-[#fafaf9] text-zinc-900">
  <!-- Header -->
  <header class="flex items-center gap-2.5 border-b border-zinc-200/70 bg-white/80 px-4 py-3 backdrop-blur">
    <img
      src={chrome.runtime.getURL('icons/icon32.png')}
      alt=""
      width="24"
      height="24"
      class="h-6 w-6 rounded-lg shadow-[0_2px_8px_rgba(99,102,241,0.35)]"
    />
    <h1 class="text-sm font-semibold tracking-tight">Web Helper AI</h1>
    <div class="ml-auto flex items-center gap-0.5">
      {#each tabs as t}
        <button
          type="button"
          onclick={() => (activeTab = t.id)}
          class:bg-zinc-900={activeTab === t.id}
          class:text-white={activeTab === t.id}
          class:text-zinc-500={activeTab !== t.id}
          class="rounded-full px-3 py-1 text-xs font-medium transition hover:text-zinc-800"
        >
          {t.label}
        </button>
      {/each}
    </div>
  </header>

  <!-- Inhalt -->
  <main class="min-h-0 flex-1 overflow-y-auto">
    {#if activeTab === 'send'}
      <SendTab {endpoints} {prompts} />
    {:else if activeTab === 'endpoints'}
      <EndpointsTab {endpoints} onChange={onEndpointsChange} />
    {:else}
      <PromptsTab {prompts} onChange={onPromptsChange} />
    {/if}
  </main>

  <footer class="border-t border-zinc-200/70 bg-white/60 px-4 py-2 text-[10px] text-zinc-400">
    Auswahl markieren &amp; mit Systemprompt + Endpunkt senden · Tools: Füllen, Klicken, Text, Lesen
  </footer>
</div>
