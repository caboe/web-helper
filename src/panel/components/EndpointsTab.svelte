<script lang="ts">
  import type { Endpoint, EndpointFormat } from '../../shared/types'
  import { newId } from '../lib/storage'
  import { testEndpoint } from '../lib/messaging'
  import { copyText } from '../lib/clipboard'
  import { ENDPOINT_TEMPLATES } from '../lib/templates'

  let { endpoints, onChange }: { endpoints: Endpoint[]; onChange: (list: Endpoint[]) => void } = $props()

  let editingId = $state<string | null>(null)
  let title = $state('')
  let url = $state('')
  let apiKey = $state('')
  let model = $state('')
  let format = $state<EndpointFormat>('auto')
  let showKey = $state(false)
  let formError = $state('')
  let testingId = $state<string | null>(null)
  let testOutcome = $state<{ id: string; ok: boolean; detail: string } | null>(null)
  let copiedId = $state<string | null>(null)
  let templateId = $state('')
  let appliedHint = $state('')

  function resetForm() {
    editingId = null
    title = ''
    url = ''
    apiKey = ''
    model = ''
    format = 'auto'
    showKey = false
    formError = ''
    testOutcome = null
    appliedHint = ''
  }

  function startEdit(ep: Endpoint) {
    editingId = ep.id
    title = ep.title
    url = ep.url
    apiKey = ''
    model = ep.model
    format = ep.format
    showKey = false
    formError = ''
    testOutcome = null
    appliedHint = ''
  }

  function uniqueTitle(base: string): string {
    const taken = new Set(endpoints.map((e) => e.title))
    if (!taken.has(base)) return base
    let i = 2
    while (taken.has(base + ' ' + i)) i += 1
    return base + ' ' + i
  }

  function applyTemplate() {
    if (!templateId) return
    const t = ENDPOINT_TEMPLATES.find((x) => x.id === templateId)
    templateId = ''
    if (!t) return
    // Vorlage füllt alle Felder außer dem API-Key vor; startet einen neuen Endpunkt.
    editingId = null
    title = uniqueTitle(t.label)
    url = t.url
    model = t.model
    format = t.format
    apiKey = ''
    showKey = false
    formError = ''
    testOutcome = null
    appliedHint = t.hint ?? ''
  }

  function submit() {
    if (!title.trim()) {
      formError = 'Bitte einen Titel angeben.'
      return
    }
    if (!url.trim()) {
      formError = 'Bitte die Endpunkt-URL angeben.'
      return
    }
    // API-Key ist optional (z. B. lokale Server wie Ollama).
    const existing = editingId ? endpoints.find((e) => e.id === editingId) : undefined
    const ep: Endpoint = {
      id: editingId ?? newId(),
      title: title.trim(),
      url: url.trim(),
      apiKey: apiKey.trim() || (existing?.apiKey ?? ''),
      model: model.trim(),
      format,
    }
    const list = editingId ? endpoints.map((e) => (e.id === editingId ? ep : e)) : [...endpoints, ep]
    onChange(list)
    resetForm()
  }

  function remove(ep: Endpoint) {
    if (!confirm('Endpunkt „' + ep.title + '“ wirklich löschen?')) return
    onChange(endpoints.filter((e) => e.id !== ep.id))
    if (editingId === ep.id) resetForm()
  }

  async function test(ep: Endpoint) {
    testingId = ep.id
    testOutcome = null
    const r = await testEndpoint(ep)
    testOutcome = r.ok ? { id: ep.id, ok: true, detail: r.detail || 'Verbindung OK' } : { id: ep.id, ok: false, detail: r.error || 'Fehler' }
    testingId = null
  }

  async function copy(ep: Endpoint) {
    const text = JSON.stringify({ ...ep }, null, 2)
    const ok = await copyText(text)
    if (ok) {
      copiedId = ep.id
      setTimeout(() => {
        if (copiedId === ep.id) copiedId = null
      }, 1500)
    }
  }

  function formatLabel(f: EndpointFormat): string {
    if (f === 'anthropic') return 'Anthropic'
    if (f === 'openai') return 'OpenAI'
    return 'Auto'
  }
</script>

<div class="flex flex-col gap-3 p-3">
  <!-- Formular -->
  <form
    onsubmit={(e) => {
      e.preventDefault()
      submit()
    }}
    class="rounded-lg border border-slate-800 bg-slate-900/60 p-3"
  >
    <div class="mb-2 flex items-center justify-between">
      <h2 class="text-sm font-semibold text-slate-200">{editingId ? 'Endpunkt bearbeiten' : 'Neuer Endpunkt'}</h2>
      {#if editingId}
        <button type="button" onclick={resetForm} class="text-[11px] text-slate-400 hover:text-slate-200">Abbrechen</button>
      {/if}
    </div>
    <div class="flex flex-col gap-2">
      <select
        bind:value={templateId}
        onchange={applyTemplate}
        class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
      >
        <option value="">Vorlage wählen (füllt Felder vor) …</option>
        {#each ENDPOINT_TEMPLATES as t}
          <option value={t.id}>{t.label}</option>
        {/each}
      </select>
      {#if appliedHint}
        <p class="text-[11px] text-slate-500">{appliedHint}</p>
      {/if}
      <input bind:value={title} type="text" placeholder="Titel, z. B. „OpenAI“" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
      <input bind:value={url} type="text" placeholder="Endpunkt-URL, z. B. https://api.openai.com/v1/chat/completions" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
      <div class="relative">
        <input
          bind:value={apiKey}
          type={showKey ? 'text' : 'password'}
          placeholder={editingId ? 'API-Key (leer lassen = beibehalten)' : 'API-Key (optional, z. B. bei Ollama leer)'}
          class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 pr-14 text-sm outline-none focus:border-indigo-500"
        />
        <button
          type="button"
          onclick={() => (showKey = !showKey)}
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded border border-slate-700 px-1.5 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800"
        >
          {showKey ? 'Ausblenden' : 'Zeigen'}
        </button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <input bind:value={model} type="text" placeholder="Modell (optional)" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
        <select bind:value={format} class="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500">
          <option value="auto">Format: Auto</option>
          <option value="openai">OpenAI-kompatibel</option>
          <option value="anthropic">Anthropic</option>
        </select>
      </div>
      <p class="text-[10px] leading-relaxed text-slate-500">
        Auto erkennt Anthropic an der URL, sonst OpenAI-kompatibel (Chat Completions). Ohne Modell gilt ein Standardmodell.
      </p>
      {#if formError}
        <p class="text-xs text-rose-300">{formError}</p>
      {/if}
      <button type="submit" class="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500">
        {editingId ? 'Speichern' : 'Hinzufügen'}
      </button>
    </div>
  </form>

  <!-- Liste -->
  <div class="flex flex-col gap-2">
    <h2 class="text-sm font-semibold text-slate-300">Übersicht ({endpoints.length})</h2>
    {#if endpoints.length === 0}
      <p class="text-xs text-slate-500">Noch keine Endpunkte angelegt.</p>
    {/if}
    {#each endpoints as ep}
      <div class="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <div class="flex items-center gap-2">
              <span class="truncate text-sm font-medium text-slate-100">{ep.title}</span>
              <span class="shrink-0 rounded bg-slate-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-slate-400">{formatLabel(ep.format)}</span>
            </div>
            <p class="mt-0.5 truncate text-[11px] text-slate-500">{ep.url}</p>
            {#if ep.model}
              <p class="text-[11px] text-slate-500">Modell: {ep.model}</p>
            {/if}
            <p class="truncate font-mono text-[10px] text-slate-600">
              {ep.apiKey ? 'Key: ' + ep.apiKey.slice(0, 6) + '••••••••' : 'ohne Key'}
            </p>
          </div>
          <div class="flex shrink-0 flex-col items-end gap-1">
            <div class="flex gap-1">
              <button type="button" onclick={() => startEdit(ep)} class="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800">Bearbeiten</button>
              <button type="button" onclick={() => copy(ep)} class="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800">
                {copiedId === ep.id ? 'Kopiert ✓' : 'Kopieren'}
              </button>
              <button type="button" onclick={() => remove(ep)} class="rounded border border-rose-800 px-2 py-0.5 text-[10px] text-rose-300 hover:bg-rose-950">Löschen</button>
            </div>
            <button
              type="button"
              onclick={() => test(ep)}
              disabled={testingId === ep.id}
              class="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              {testingId === ep.id ? 'Testet …' : 'Verbindung testen'}
            </button>
            {#if testOutcome && testOutcome.id === ep.id}
              <p class:emerald-300={testOutcome.ok} class:rose-300={!testOutcome.ok} class="text-[10px]">
                {testOutcome.ok ? '✓ ' + testOutcome.detail : '✗ ' + testOutcome.detail}
              </p>
            {/if}
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>