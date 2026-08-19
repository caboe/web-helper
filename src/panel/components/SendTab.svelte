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

  const selectionFor = $derived(pageState?.hasSelection ? pageState.selection : '')
  const pageFor = $derived(pageState?.markdown ?? '')
  const preview = $derived(
    mode === 'selection'
      ? selectionFor.length > 600
        ? selectionFor.slice(0, 600) + ' …'
        : selectionFor
      : pageFor.length > 600
        ? pageFor.slice(0, 600) + ' …'
        : pageFor,
  )
  const running = $derived(status === 'running')
  const endpoint = $derived(endpoints.find((e) => e.id === endpointId) ?? null)
  const prompt = $derived(prompts.find((p) => p.id === promptId) ?? null)

  // Light-Air-Design-Tokens
  const card = 'rounded-2xl bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04),0_6px_16px_rgba(24,24,27,0.06)]'
  const label = 'mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-zinc-500'
  const input = 'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15'
  const ghost = 'rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-600 transition hover:bg-zinc-50'
  const primary =
    'rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(99,102,241,0.35)] transition hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(99,102,241,0.4)]'

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
    // Bei „Auswahl“ wird IMMER die ganze Seite als Kontext mitgeschickt,
    // der markierte Ausschnitt ist der primäre Fokus.
    let userContent = pageState.markdown
    let selection: string | undefined = undefined
    if (mode === 'selection') {
      if (pageState.hasSelection) {
        selection = pageState.selection
        note = 'Auswahl gesendet – ganze Seite als Kontext beigefügt.'
      } else {
        note = 'Keine Markierung gefunden – stattdessen wurde die ganze Seite gesendet.'
      }
    } else {
      note = ''
    }
    if (!userContent.trim()) {
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
      userContent,
      selection,
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

<div class="flex flex-col gap-4 p-4">
  <!-- Warnung: keine Endpunkte -->
  {#if endpoints.length === 0}
    <div class="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800">
      Noch kein LLM-Endpunkt angelegt. Wechsle zu <strong class="font-semibold">Settings → Endpunkte</strong> und füge
      einen hinzu (z. B. OpenAI, OpenRouter, Ollama oder Anthropic).
    </div>
  {/if}

  <!-- Modus-Auswahl -->
  <div>
    <span class={label}>Inhalt senden</span>
    <div class="flex rounded-full bg-zinc-200/60 p-1">
      <button
        type="button"
        onclick={() => (mode = 'selection')}
        class:bg-white={mode === 'selection'}
        class:shadow-sm={mode === 'selection'}
        class:text-zinc-900={mode === 'selection'}
        class:text-zinc-500={mode !== 'selection'}
        class="flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition"
      >
        Auswahl
      </button>
      <button
        type="button"
        onclick={() => (mode = 'page')}
        class:bg-white={mode === 'page'}
        class:shadow-sm={mode === 'page'}
        class:text-zinc-900={mode === 'page'}
        class:text-zinc-500={mode !== 'page'}
        class="flex-1 rounded-full px-3 py-1.5 text-xs font-medium transition"
      >
        Ganze Seite
      </button>
    </div>
    {#if mode === 'selection' && pageState && !pageState.hasSelection}
      <p class="mt-1.5 text-[11px] text-zinc-400">
        Aktuell nichts markiert – beim Senden wird die ganze Seite verwendet.
      </p>
    {/if}
  </div>

  <!-- Seitenstatus / Vorschau -->
  {#if pageError}
    <div class="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
      {pageError}
      {#if currentTabId}
        <button type="button" onclick={refresh} class="ml-2 font-semibold underline">Erneut versuchen</button>
      {/if}
    </div>
  {:else if pageState}
    <div class={card + ' p-3'}>
      <div class="mb-2 flex items-center justify-between gap-2">
        <span class="truncate text-[11px] font-medium text-zinc-500">{pageState.title}</span>
        <div class="flex shrink-0 items-center gap-2">
          {#if mode === 'selection' && pageState?.hasSelection}
            <span class="text-[10px] text-zinc-400">
              Auswahl: {selectionFor.length.toLocaleString('de-DE')} · Seite: {pageFor.length.toLocaleString('de-DE')}
            </span>
          {:else}
            <span class="text-[10px] text-zinc-400">{pageFor.length.toLocaleString('de-DE')} Zeichen</span>
          {/if}
          <button type="button" onclick={refresh} disabled={refreshing} class={ghost + ' disabled:opacity-50'}>
            {refreshing ? '…' : 'Aktualisieren'}
          </button>
        </div>
      </div>
      <div class="max-h-28 overflow-y-auto whitespace-pre-wrap break-words rounded-xl bg-zinc-50 p-2.5 text-[11px] leading-relaxed text-zinc-600">
        {preview || '– keine Inhalte extrahiert –'}
      </div>
    </div>
  {/if}

  <!-- Endpunkt + Prompt -->
  <div class="flex flex-col gap-3">
    <label class="block">
      <span class={label}>LLM-Endpunkt</span>
      <select bind:value={endpointId} class={input}>
        <option value="">– Endpunkt wählen –</option>
        {#each endpoints as e}
          <option value={e.id}>{endpointLabel(e)}</option>
        {/each}
      </select>
    </label>
    <label class="block">
      <span class={label}>Systemprompt</span>
      <select bind:value={promptId} class={input}>
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
      class="{primary} flex-1 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
    >
      {running ? 'Verarbeitet …' : 'An LLM senden'}
    </button>
    {#if running}
      <button
        type="button"
        onclick={cancel}
        class="rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-600 transition hover:bg-zinc-50"
      >
        Abbrechen
      </button>
    {/if}
  </div>

  <!-- Tool-Log -->
  {#if toolLog.length > 0}
    <div class={card + ' p-3'}>
      <div class="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-zinc-700">
        <span class="h-1.5 w-1.5 rounded-full bg-indigo-500"></span>
        Tool-Aufrufe auf der Seite ({toolLog.length})
      </div>
      <ul class="flex flex-col gap-1.5">
        {#each toolLog as t}
          <li class="rounded-xl bg-zinc-50 px-2.5 py-2 text-[11px] leading-snug">
            <span class="font-mono font-semibold text-indigo-600">{t.name}</span>
            <span class="text-zinc-400"> {t.args.slice(0, 80)}</span>
            <div class="mt-0.5 text-zinc-500">{t.result.slice(0, 160)}</div>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Laufend -->
  {#if status === 'running'}
    <div class="flex items-center gap-2.5 rounded-2xl bg-white p-3 text-xs text-zinc-500 shadow-sm">
      <span class="h-3.5 w-3.5 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></span>
      Das Modell arbeitet … (Tool-Calling aktiv)
    </div>
  {/if}

  <!-- Ergebnis -->
  {#if status === 'done' && resultText}
    <div class={card + ' p-3.5'}>
      <div class="mb-2 flex items-center justify-between">
        <span class="flex items-center gap-1.5 text-xs font-semibold text-zinc-900">
          <span class="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
          Antwort
        </span>
        <div class="flex gap-1.5">
          <button type="button" onclick={copyResult} class={ghost}>
            {copied ? 'Kopiert ✓' : 'Kopieren'}
          </button>
          <button type="button" onclick={insertResult} class={ghost}>
            In Seite einfügen
          </button>
        </div>
      </div>
      <p class="max-h-52 overflow-y-auto whitespace-pre-wrap break-words text-xs leading-relaxed text-zinc-700">
        {resultText}
      </p>
    </div>
  {/if}

  {#if errorMsg}
    <div class="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
      {errorMsg}
    </div>
  {/if}

  {#if note}
    <p class="text-[11px] text-zinc-500">{note}</p>
  {/if}
</div>