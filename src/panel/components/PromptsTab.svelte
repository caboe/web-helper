<script lang="ts">
  import type { SystemPrompt } from '../../shared/types'
  import { newId } from '../lib/storage'
  import { copyText } from '../lib/clipboard'
  import { t, getLocale } from '../lib/i18n.svelte'
  import { getDefaultPrompts } from '../../shared/defaultPrompts'

  let { prompts, onChange }: { prompts: SystemPrompt[]; onChange: (list: SystemPrompt[]) => void } = $props()

  let editingId = $state<string | null>(null)
  let title = $state('')
  let text = $state('')
  let formError = $state('')
  let copiedId = $state<string | null>(null)

  // Light-Air-Design-Tokens
  const card = 'rounded-2xl bg-white shadow-[0_1px_2px_rgba(24,24,27,0.04),0_6px_16px_rgba(24,24,27,0.06)]'
  const input = 'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition placeholder:text-zinc-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/15'
  const ghost = 'rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[10px] font-medium text-zinc-600 transition hover:bg-zinc-50'
  const primary =
    'rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(99,102,241,0.35)] transition hover:-translate-y-px hover:shadow-[0_6px_18px_rgba(99,102,241,0.4)]'

  function resetForm() {
    editingId = null
    title = ''
    text = ''
    formError = ''
  }

  function startEdit(p: SystemPrompt) {
    editingId = p.id
    title = p.title
    text = p.prompt
    formError = ''
  }

  function submit() {
    if (!title.trim()) {
      formError = t('errTitle')
      return
    }
    if (!text.trim()) {
      formError = t('errPromptText')
      return
    }
    const sp: SystemPrompt = {
      id: editingId ?? newId(),
      title: title.trim(),
      prompt: text.trim(),
    }
    const list = editingId ? prompts.map((p) => (p.id === editingId ? sp : p)) : [...prompts, sp]
    onChange(list)
    resetForm()
  }

  function remove(p: SystemPrompt) {
    if (!confirm(t('confirmDeletePrompt', { title: p.title }))) return
    onChange(prompts.filter((x) => x.id !== p.id))
    if (editingId === p.id) resetForm()
  }

  function resetDefaults() {
    if (!confirm(t('confirmResetPrompts'))) return
    const seeds = getDefaultPrompts(getLocale())
    onChange(seeds.map((s) => ({ id: newId(), title: s.title, prompt: s.prompt })))
  }

  async function copy(p: SystemPrompt) {
    const ok = await copyText(p.prompt)
    if (ok) {
      copiedId = p.id
      setTimeout(() => {
        if (copiedId === p.id) copiedId = null
      }, 1500)
    }
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
      <h2 class="text-sm font-semibold text-zinc-900">{editingId ? t('editPrompt') : t('newPrompt')}</h2>
      {#if editingId}
        <button type="button" onclick={resetForm} class="text-[11px] font-medium text-zinc-400 hover:text-zinc-700">
          {t('cancel')}
        </button>
      {/if}
    </div>
    <div class="flex flex-col gap-2.5">
      <input bind:value={title} type="text" placeholder={t('phPromptTitle')} class={input} />
      <textarea
        bind:value={text}
        rows={6}
        placeholder={t('phPromptText')}
        class={input + ' resize-y'}
      ></textarea>
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
    <div class="flex items-center justify-between">
      <h2 class="flex items-center gap-2 text-sm font-semibold text-zinc-700">
        {t('overview', { n: prompts.length })}
        <span class="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600">{prompts.length}</span>
      </h2>
      <button type="button" onclick={resetDefaults} class="{ghost}">
        {t('resetDefaults')}
      </button>
    </div>
    {#if prompts.length === 0}
      <p class="text-xs text-zinc-400">{t('noPrompts')}</p>
    {/if}
    {#each prompts as p}
      <div class="flex items-start justify-between gap-3 {card} p-3.5">
        <div class="min-w-0">
          <span class="block truncate text-sm font-medium text-zinc-900">{p.title}</span>
          <p class="mt-1 max-h-16 overflow-hidden whitespace-pre-wrap break-words text-[11px] leading-relaxed text-zinc-500">
            {p.prompt}
          </p>
        </div>
        <div class="flex shrink-0 gap-1">
          <button type="button" onclick={() => startEdit(p)} class={ghost}>{t('edit')}</button>
          <button type="button" onclick={() => copy(p)} class={ghost}>
            {copiedId === p.id ? t('copied') : t('copy')}
          </button>
          <button
            type="button"
            onclick={() => remove(p)}
            class="rounded-lg border border-rose-200 bg-white px-2 py-1 text-[10px] font-medium text-rose-600 transition hover:bg-rose-50"
          >
            {t('delete')}
          </button>
        </div>
      </div>
    {/each}
  </div>
</div>