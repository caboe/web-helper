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

<div class="flex h-full flex-col bg-slate-950 text-slate-200">
  <!-- Header -->
  <header class="flex items-center gap-2 border-b border-slate-800 bg-slate-900/60 px-3 py-2.5">
    <img
      src={chrome.runtime.getURL('icons/icon32.png')}
      alt=""
      width="24"
      height="24"
      class="h-6 w-6 rounded-md"
    />
    <h1 class="text-sm font-semibold tracking-tight text-slate-100">Web Helper AI</h1>
    <div class="ml-auto flex gap-1">
      {#each tabs as t}
        <button
          type="button"
          onclick={() => (activeTab = t.id)}
          class:bg-indigo-600={activeTab === t.id}
          class:bg-slate-800={activeTab !== t.id}
          class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors"
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

  <footer class="border-t border-slate-800 bg-slate-900/60 px-3 py-1.5 text-[10px] text-slate-500">
    Auswahl markieren &amp; mit Systemprompt + Endpunkt senden · Tools: Füllen, Klicken, Text, Lesen
  </footer>
</div>
