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

  // Light-Air-Design-Tokens
  const card = 'rounded-2xl bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04),0_6px_16px_rgba(24,24,27,0.06)]'
  const input = 'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15'
  const ghost = 'rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-medium text-zinc-600 transition hover:bg-zinc-50'
  const primary =
    'rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(99,102,241,0.35)] transition hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(99,102,241,0.4)]'

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

<div class="flex flex-col gap-4 p-4">
  <!-- Formular -->
  <form
    onsubmit={(e) => {
      e.preventDefault()
      submit()
    }}
    class={card + ' p-4'}
  >
    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-sm font-semibold text-zinc-900">{editingId ? 'Endpunkt bearbeiten' : 'Neuer Endpunkt'}</h2>
      {#if editingId}
        <button type="button" onclick={resetForm} class="text-[11px] font-medium text-zinc-400 hover:text-zinc-700">
          Abbrechen
        </button>
      {/if}
    </div>
    <div class="flex flex-col gap-2.5">
      <select
        bind:value={templateId}
        onchange={applyTemplate}
        class={input}
      >
        <option value="">Vorlage wählen (füllt Felder vor) …</option>
        {#each ENDPOINT_TEMPLATES as t}
          <option value={t.id}>{t.label}</option>
        {/each}
      </select>
      {#if appliedHint}
        <p class="text-[11px] text-zinc-500">{appliedHint}</p>
      {/if}
      <input bind:value={title} type="text" placeholder="Titel, z. B. „OpenAI“" class={input} />
      <input bind:value={url} type="text" placeholder="Endpunkt-URL, z. B. https://api.openai.com/v1/chat/completions" class={input} />
      <div class="relative">
        <input
          bind:value={apiKey}
          type={showKey ? 'text' : 'password'}
          placeholder={editingId ? 'API-Key (leer lassen = beibehalten)' : 'API-Key (optional, z. B. bei Ollama leer)'}
          class={input + ' pr-16'}
        />
        <button
          type="button"
          onclick={() => (showKey = !showKey)}
          class="absolute right-2 top-1/2 -translate-y-1/2 rounded-md border border-zinc-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 hover:bg-zinc-50"
        >
          {showKey ? 'Ausblenden' : 'Zeigen'}
        </button>
      </div>
      <div class="grid grid-cols-2 gap-2.5">
        <input bind:value={model} type="text" placeholder="Modell (optional)" class={input} />
        <select bind:value={format} class={input}>
          <option value="auto">Format: Auto</option>
          <option value="openai">OpenAI-kompatibel</option>
          <option value="anthropic">Anthropic</option>
        </select>
      </div>
      <p class="text-[10px] leading-relaxed text-zinc-400">
        Auto erkennt Anthropic an der URL, sonst OpenAI-kompatibel (Chat Completions). Ohne Modell gilt ein Standardmodell.
      </p>
      {#if formError}
        <p class="text-xs font-medium text-rose-600">{formError}</p>
      {/if}
      <button type="submit" class={primary}>
        {editingId ? 'Speichern' : 'Hinzufügen'}
      </button>
    </div>
  </form>

  <!-- Liste -->
  <div class="flex flex-col gap-2.5">
    <h2 class="flex items-center gap-2 text-sm font-semibold text-zinc-700">
      Übersicht
      <span class="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">{endpoints.length}</span>
    </h2>
    {#if endpoints.length === 0}
      <p class="text-xs text-zinc-400">Noch keine Endpunkte angelegt.</p>
    {/if}
    {#each endpoints as ep}
      <div class="flex items-start gap-3 {card} p-3.5">
        <span
          class="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full"
          class:bg-indigo-500={ep.format === 'openai'}
          class:bg-orange-500={ep.format === 'anthropic'}
          class:bg-zinc-300={ep.format === 'auto'}
        ></span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="truncate text-sm font-medium text-zinc-900">{ep.title}</span>
            <span class="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
              {formatLabel(ep.format)}
            </span>
          </div>
          <p class="mt-0.5 truncate text-[11px] text-zinc-500">{ep.url}</p>
          <p class="text-[11px] text-zinc-400">Modell: {ep.model || 'Standard'}</p>
          <p class="truncate font-mono text-[10px] text-zinc-400">
            {ep.apiKey ? 'Key: ' + ep.apiKey.slice(0, 6) + '••••••••' : 'ohne Key'}
          </p>
        </div>
        <div class="flex shrink-0 flex-col items-end gap-1.5">
          <div class="flex gap-1">
            <button type="button" onclick={() => startEdit(ep)} class={ghost}>Bearbeiten</button>
            <button type="button" onclick={() => copy(ep)} class={ghost}>
              {copiedId === ep.id ? 'Kopiert ✓' : 'Kopieren'}
            </button>
            <button
              type="button"
              onclick={() => remove(ep)}
              class="rounded-lg border border-rose-200 bg-white px-2 py-1 text-[10px] font-medium text-rose-600 transition hover:bg-rose-50"
            >
              Löschen
            </button>
          </div>
          <button
            type="button"
            onclick={() => test(ep)}
            disabled={testingId === ep.id}
            class={ghost + ' disabled:opacity-50'}
          >
            {testingId === ep.id ? 'Testet …' : 'Verbindung testen'}
          </button>
          {#if testOutcome && testOutcome.id === ep.id}
            <p
              class="text-[10px] font-medium"
              class:text-emerald-600={testOutcome.ok}
              class:text-rose-600={!testOutcome.ok}
            >
              {testOutcome.ok ? '✓ ' + testOutcome.detail : '✗ ' + testOutcome.detail}
            </p>
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
