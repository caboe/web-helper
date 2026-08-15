<script lang="ts">
  import { onMount } from 'svelte'
  import type { Endpoint, PageState, PortRequest, PortUpdate, SystemPrompt } from '../../shared/types'
  import { fetchPageState, getActiveTabId, insertTextIntoPage } from '../lib/messaging'
  import { copyText } from '../lib/clipboard'
  import { loadSettings, saveSettings } from '../lib/storage'

  let { endpoints, prompts }: { endpoints: Endpoint[]; prompts: SystemPrompt[] } = $props()

  let mode = $state<'selection' | 'page'>('page')
  let pageState = $state<PageState | null>(null)
  let pageError: string = $state('')
  let refreshing = $state(false)
  let endpointId: string = $state('')
  let promptId: string = $state('')
  let status = $state<'idle' | 'running' | 'done' | 'error'>('idle')
  let resultText: string = $state('')
  let errorMsg = $state('')
  let note = $state('')
  let toolLog = $state<{ name: string; args: string; result: string }[]>([])
  let currentTabId = $state(0)
  let copied = $state(false)
  let port: chrome.runtime.Port | null = null

  const contentFor = $derived(
    mode === 'selection' ? (pageState?.hasSelection ? pageState.selection : '') : (pageState?.markdown ?? ''),
  )
  const preview = $derived(contentFor.length > 600 ? contentFor.slice(0, 600) + ' …' : contentFor)
  const running = $derived(status === 'running')
  const endpoint = $derived(endpoints.find((e) => e.id === endpointId) ?? null)
  const prompt = $derived(prompts.find((p) => p.id === promptId) ?? null)

  onMount(() => {
    loadSettings().then((s) => {
      if (s.mode) mode = s.mode
      if (s.endpointId) endpointId = s.endpointId
      if (s.promptId) promptId = s.promptId
    })
    refresh()
    chrome.tabs.onActivated.addListener(handleTabActivated)
    chrome.tabs.onUpdated.addListener(handleTabUpdated)
    return () => {
      chrome.tabs.onActivated.removeListener(handleTabActivated)
      chrome.tabs.onUpdated.removeListener(handleTabUpdated)
    }
  })

  function handleTabActivated() {
    refresh()
  }

  function handleTabUpdated(_tabId: number, info: { status?: string }) {
    if (info.status === 'complete') refresh()
  }

  async function refresh() {
    refreshing = true
    pageError = ''
    try {
      const tabId = await getActiveTabId()
      currentTabId = tabId
      pageState = await fetchPageState(tabId)
    } catch (e) {
      pageState = null
      pageError = e instanceof Error ? e.message : String(e)
    } finally {
      refreshing = false
    }
  }

  function disconnect() {
    if (port) {
      try {
        port.disconnect()
      } catch {
        /* ignore */
      }
      port = null
    }
  }

  function send() {
    if (!endpoint) {
      errorMsg = 'Bitte zuerst einen Endpunkt auswählen oder unter „Endpunkte“ anlegen.'
      status = 'error'
      return
    }
    if (!pageState || !currentTabId) {
      errorMsg = 'Kein Seiteninhalt verfügbar. Bitte die Seite neu laden und erneut versuchen.'
      status = 'error'
      return
    }
    let content = mode === 'selection' ? (pageState.hasSelection ? pageState.selection : '') : pageState.markdown
    if (mode === 'selection' && !content.trim()) {
      content = pageState.markdown
      note = 'Keine Markierung gefunden – stattdessen wurde die ganze Seite gesendet.'
    } else {
      note = ''
    }
    if (!content.trim()) {
      errorMsg = 'Kein Seiteninhalt extrahiert.'
      status = 'error'
      return
    }
    resultText = ''
    errorMsg = ''
    toolLog = []
    status = 'running'
    saveSettings({ mode, endpointId, promptId })

    port = chrome.runtime.connect({ name: 'llm' })
    port.onMessage.addListener((m: PortUpdate) => {
      if (m.type === 'progress') return
      if (m.type === 'tool') {
        toolLog = [...toolLog, { name: m.name, args: m.args, result: m.result }]
        return
      }
      if (m.type === 'done') {
        resultText = m.result.text
        status = 'done'
        disconnect()
        return
      }
      if (m.type === 'error') {
        errorMsg = m.error
        status = 'error'
        disconnect()
      }
    })
    const req: PortRequest = {
      kind: 'llm-run',
      endpoint,
      systemPrompt: prompt?.prompt ?? '',
      userContent: content,
      pageUrl: pageState.url,
      pageTitle: pageState.title,
      tabId: currentTabId,
    }
    port.postMessage(req)
  }

  function cancel() {
    disconnect()
    if (status === 'running') {
      status = 'idle'
      note = 'Lauf abgebrochen.'
    }
  }

  async function copyResult() {
    const ok = await copyText(resultText)
    if (ok) {
      copied = true
      setTimeout(() => (copied = false), 1500)
    }
  }

  async function insertResult() {
    if (!resultText || !currentTabId) return
    const ok = await insertTextIntoPage(currentTabId, resultText, 'replace')
    if (ok) {
      note = 'Antwort wurde an der Markierung in die Seite eingefügt.'
      errorMsg = ''
    } else {
      errorMsg = 'Einfügen fehlgeschlagen – bitte auf der Seite Text markieren und erneut versuchen.'
      status = 'error'
    }
  }

  function endpointLabel(e: Endpoint): string {
    const extra = e.format === 'anthropic' ? ' (Anthropic)' : e.format === 'openai' ? ' (OpenAI)' : ''
    return e.title + extra
  }
</script>

<div class="flex flex-col gap-3 p-3">
  <!-- Warnung: keine Endpunkte -->
  {#if endpoints.length === 0}
    <div class="rounded-lg border border-amber-700/60 bg-amber-950/40 p-3 text-xs text-amber-200">
      Noch kein LLM-Endpunkt angelegt. Wechsle zum Tab <strong>Endpunkte</strong> und füge einen hinzu
      (z. B. OpenAI, OpenRouter, Ollama oder Anthropic).
    </div>
  {/if}

  <!-- Modus-Auswahl -->
  <div>
    <div class="mb-1.5 text-xs font-medium text-slate-400">Inhalt senden</div>
    <div class="flex rounded-lg border border-slate-700 bg-slate-900 p-0.5">
      <button
        type="button"
        onclick={() => (mode = 'selection')}
        class:bg-indigo-600={mode === 'selection'}
        class="flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
      >
        Auswahl
      </button>
      <button
        type="button"
        onclick={() => (mode = 'page')}
        class:bg-indigo-600={mode === 'page'}
        class="flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors"
      >
        Ganze Seite
      </button>
    </div>
    {#if mode === 'selection' && pageState && !pageState.hasSelection}
      <p class="mt-1 text-[11px] text-slate-500">
        Aktuell nichts markiert – beim Senden wird die ganze Seite verwendet.
      </p>
    {/if}
  </div>

  <!-- Seitenstatus / Vorschau -->
  {#if pageError}
    <div class="rounded-lg border border-rose-800/60 bg-rose-950/40 p-3 text-xs text-rose-200">
      {pageError}
      {#if currentTabId}
        <button type="button" onclick={refresh} class="ml-2 underline">Erneut versuchen</button>
      {/if}
    </div>
  {:else if pageState}
    <div class="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
      <div class="mb-1 flex items-center justify-between gap-2">
        <span class="truncate text-[11px] text-slate-400">{pageState.title}</span>
        <div class="flex shrink-0 items-center gap-2">
          <span class="text-[10px] text-slate-500">{contentFor.length.toLocaleString('de-DE')} Zeichen</span>
          <button
            type="button"
            onclick={refresh}
            disabled={refreshing}
            class="rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {refreshing ? '…' : 'Aktualisieren'}
          </button>
        </div>
      </div>
      <p class="max-h-28 overflow-y-auto whitespace-pre-wrap break-words rounded bg-slate-950/60 p-2 text-[11px] leading-relaxed text-slate-300">
        {preview || '– keine Inhalte extrahiert –'}
      </p>
    </div>
  {/if}

  <!-- Endpunkt + Prompt -->
  <div class="grid grid-cols-1 gap-2">
    <label class="block">
      <span class="mb-1 block text-xs font-medium text-slate-400">LLM-Endpunkt</span>
      <select bind:value={endpointId} class="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm">
        <option value="">– Endpunkt wählen –</option>
        {#each endpoints as e}
          <option value={e.id}>{endpointLabel(e)}</option>
        {/each}
      </select>
    </label>
    <label class="block">
      <span class="mb-1 block text-xs font-medium text-slate-400">Systemprompt</span>
      <select bind:value={promptId} class="w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-2 text-sm">
        <option value="">– ohne Systemprompt –</option>
        {#each prompts as p}
          <option value={p.id}>{p.title}</option>
        {/each}
      </select>
    </label>
  </div>

  <!-- Senden -->
  <div class="flex items-center gap-2">
    <button
      type="button"
      onclick={send}
      disabled={running}
      class="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {running ? 'Verarbeitet …' : 'An LLM senden'}
    </button>
    {#if running}
      <button
        type="button"
        onclick={cancel}
        class="rounded-lg border border-slate-700 px-3 py-2.5 text-sm text-slate-300 hover:bg-slate-800"
      >
        Abbrechen
      </button>
    {/if}
  </div>

  <!-- Tool-Log -->
  {#if toolLog.length > 0}
    <div class="rounded-lg border border-slate-800 bg-slate-900/60 p-2.5">
      <div class="mb-1.5 text-xs font-medium text-slate-400">Tool-Aufrufe auf der Seite ({toolLog.length})</div>
      <ul class="flex flex-col gap-1.5">
        {#each toolLog as t}
          <li class="rounded bg-slate-950/60 p-1.5 text-[11px] leading-snug">
            <span class="font-mono text-indigo-300">{t.name}</span>
            <span class="text-slate-500"> {t.args.slice(0, 80)}</span>
            <div class="text-slate-400">{t.result.slice(0, 160)}</div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Ergebnis -->
  {#if status === 'running'}
    <div class="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400">
      <span class="h-3 w-3 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></span>
      Das Modell arbeitet … (Tool-Calling aktiv)
    </div>
  {/if}

  {#if status === 'done' && resultText}
    <div class="rounded-lg border border-emerald-800/60 bg-emerald-950/30 p-2.5">
      <div class="mb-1 flex items-center justify-between">
        <span class="text-xs font-medium text-emerald-300">Antwort</span>
        <div class="flex gap-1.5">
          <button type="button" onclick={copyResult} class="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800">
            {copied ? 'Kopiert ✓' : 'Kopieren'}
          </button>
          <button type="button" onclick={insertResult} class="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800">
            In Seite einfügen
          </button>
        </div>
      </div>
      <p class="max-h-52 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-slate-200">
        {resultText}
      </p>
    </div>
  {/if}

  {#if errorMsg}
    <div class="rounded-lg border border-rose-800/60 bg-rose-950/40 p-2.5 text-xs text-rose-200">
      {errorMsg}
    </div>
  {/if}

  {#if note}
    <p class="text-[11px] text-slate-500">{note}</p>
  {/if}
</div>