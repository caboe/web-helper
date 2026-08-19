<script lang="ts">
  import type { Endpoint, EndpointFormat } from '../../shared/types'
  import { newId } from '../lib/storage'
  import { testEndpoint } from '../lib/messaging'
  import { copyText } from '../lib/clipboard'
  import { ENDPOINT_TEMPLATES } from '../lib/templates'
  import { t, getLocale } from '../lib/i18n.svelte'

  let { endpoints, onChange }: { endpoints: Endpoint[]; onChange: (list: Endpoint[]) => void } = $props()

  let editingId = $state<string | null>(null)
  let title = $state('')
  let url = $state('')
  let apiKey = $state('')
  let model = $state('')
  let format = $state<EndpointFormat>('auto')
  let vision = $state(false)
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
    vision = false
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
    vision = ep.vision ?? false
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
    vision = false
    apiKey = ''
    showKey = false
    formError = ''
    testOutcome = null
    appliedHint = t.hint ?? ''
  }

  function submit() {
    if (!title.trim()) {
      formError = t('errTitle')
      return
    }
    if (!url.trim()) {
      formError = t('errUrl')
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
      vision,
    }
    const list = editingId ? endpoints.map((e) => (e.id === editingId ? ep : e)) : [...endpoints, ep]
    onChange(list)
    resetForm()
  }

  function remove(ep: Endpoint) {
    if (!confirm(t('confirmDeleteEndpoint', { title: ep.title }))) return
    onChange(endpoints.filter((e) => e.id !== ep.id))
    if (editingId === ep.id) resetForm()
  }

  async function test(ep: Endpoint) {
    testingId = ep.id
    testOutcome = null
    const r = await testEndpoint(ep, getLocale())
    testOutcome = r.ok ? { id: ep.id, ok: true, detail: r.detail || t('connectionOk') } : { id: ep.id, ok: false, detail: r.error || '?' }
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
    if (f === 'anthropic') return t('formatAnthropicLabel')
    if (f === 'openai') return t('formatOpenaiLabel')
    return t('formatAutoLabel')
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
      <h2 class="text-sm font-semibold text-zinc-900">{editingId ? t('editEndpoint') : t('newEndpoint')}</h2>
      {#if editingId}
        <button type="button" onclick={resetForm} class="text-[11px] font-medium text-zinc-400 hover:text-zinc-700">
          {t('cancel')}
        </button>
      {/if}
    </div>
    <div class="flex flex-col gap-2.5">
      <select
        bind:value={templateId}
        onchange={applyTemplate}
        class={input}
      >
        <option value="">{t('templatePlaceholder')}</option>
        {#each ENDPOINT_TEMPLATES as t}
          <option value={t.id}>{t.label}</option>
        {/each}
      </select>
      {#if appliedHint}
        <p class="text-[11px] text-zinc-500">{appliedHint}</p>
      {/if}
      <input bind:value={title} type="text" placeholder={t('phTitle')} class={input} />
      <input bind:value={url} type="text" placeholder={t('phUrl')} class={input} />
      <div class="relative">
        <input
          bind:value={apiKey}
          type={showKey ? 'text' : 'password'}
          placeholder={editingId ? t('phKeyKeep') : t('phKeyOptional')}
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
        <input bind:value={model} type="text" placeholder={t('phModel')} class={input} />
        <select bind:value={format} class={input}>
          <option value="auto">{t('formatAutoOption')}</option>
          <option value="openai">{t('formatOpenaiOption')}</option>
          <option value="anthropic">{t('formatAnthropicOption')}</option>
        </select>
      </div>
      <label class="flex cursor-pointer items-start gap-2.5 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2.5">
        <input
          type="checkbox"
          bind:checked={vision}
          class="mt-0.5 h-4 w-4 rounded border-zinc-300 text-indigo-600 accent-indigo-600 focus:ring-indigo-500/30"
        />
        <span class="flex flex-col gap-0.5">
          <span class="text-xs font-medium text-zinc-800">{t('visionLabel')}</span>
          <span class="text-[10px] leading-relaxed text-zinc-500">{t('visionHint')}</span>
        </span>
      </label>
      <p class="text-[10px] leading-relaxed text-zinc-400">
        {t('formatHint')}
      </p>
      {#if formError}
        <p class="text-xs font-medium text-rose-600">{formError}</p>
      {/if}
      <button type="submit" class={primary}>
        {editingId ? t('save') : t('add')}
      </button>
    </div>
  </form>

  <!-- Liste -->
  <div class="flex flex-col gap-2.5">
    <h2 class="flex items-center gap-2 text-sm font-semibold text-zinc-700">
      {t('overview', { n: endpoints.length })}
      
    </h2>
    {#if endpoints.length === 0}
      <p class="text-xs text-zinc-400">{t('noEndpoints')}</p>
    {/if}
    {#each endpoints as ep}
      <div class="{card} p-3.5">
        <!-- Titel + Badge + Icon-Aktionen auf einer Zeile -->
        <div class="flex items-center justify-between gap-2">
          <div class="flex min-w-0 items-center gap-2">
            <span
              class="h-2.5 w-2.5 shrink-0 rounded-full"
              class:bg-indigo-500={ep.format === 'openai'}
              class:bg-orange-500={ep.format === 'anthropic'}
              class:bg-zinc-300={ep.format === 'auto'}
            ></span>
            <span class="truncate text-sm font-medium text-zinc-900" title={ep.title}>{ep.title}</span>
            <span class="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-500">
              {formatLabel(ep.format)}
            </span>
            {#if ep.vision}
              <span class="shrink-0 rounded-full bg-violet-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-violet-600">
                {t('visionBadge')}
              </span>
            {/if}
          </div>
          <div class="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onclick={() => test(ep)}
              disabled={testingId === ep.id}
              title={testingId === ep.id ? t('testing') : t('testConnection')}
              aria-label={t('testConnection')}
              class="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-wait disabled:opacity-50"
            >
              {#if testingId === ep.id}
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/></svg>
              {/if}
            </button>
            <button
              type="button"
              onclick={() => startEdit(ep)}
              title={t('edit')}
              aria-label={t('edit')}
              class="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
            </button>
            <button
              type="button"
              onclick={() => copy(ep)}
              title={copiedId === ep.id ? t('copied') : t('copy')}
              aria-label={t('copy')}
              class="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700"
              class:text-emerald-500={copiedId === ep.id}
            >
              {#if copiedId === ep.id}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              {:else}
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              {/if}
            </button>
            <button
              type="button"
              onclick={() => remove(ep)}
              title={t('delete')}
              aria-label={t('delete')}
              class="grid h-7 w-7 place-items-center rounded-lg text-zinc-400 transition hover:bg-rose-50 hover:text-rose-600"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
        <!-- Endpunkt-Info in voller Breite -->
        <p class="mt-2 truncate text-[11px] text-zinc-500" title={ep.url}>{ep.url}</p>
        <p class="mt-0.5 truncate text-[10px] text-zinc-400">
          {t('modelLabel', { model: ep.model || t('modelDefault') })} · {ep.apiKey ? t('keyMasked', { prefix: ep.apiKey.slice(0, 6) }) : t('noKey')}
        </p>
        {#if testOutcome && testOutcome.id === ep.id}
          <p
            class="mt-1.5 text-[10px] font-medium"
            class:text-emerald-600={testOutcome.ok}
            class:text-rose-600={!testOutcome.ok}
          >
            {testOutcome.ok ? '✓ ' + testOutcome.detail : '✗ ' + testOutcome.detail}
          </p>
        {/if}
      </div>
    {/each}
  </div>
</div>