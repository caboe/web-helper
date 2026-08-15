<script lang="ts">
  import type { SystemPrompt } from '../../shared/types'
  import { newId } from '../lib/storage'
  import { copyText } from '../lib/clipboard'

  let { prompts, onChange }: { prompts: SystemPrompt[]; onChange: (list: SystemPrompt[]) => void } = $props()

  let editingId = $state<string | null>(null)
  let title = $state('')
  let text = $state('')
  let formError = $state('')
  let copiedId = $state<string | null>(null)

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
      formError = 'Bitte einen Titel angeben.'
      return
    }
    if (!text.trim()) {
      formError = 'Bitte einen Prompt-Text angeben.'
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
    if (!confirm('Systemprompt „' + p.title + '“ wirklich löschen?')) return
    onChange(prompts.filter((x) => x.id !== p.id))
    if (editingId === p.id) resetForm()
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
      <h2 class="text-sm font-semibold text-slate-200">{editingId ? 'Systemprompt bearbeiten' : 'Neuer Systemprompt'}</h2>
      {#if editingId}
        <button type="button" onclick={resetForm} class="text-[11px] text-slate-400 hover:text-slate-200">Abbrechen</button>
      {/if}
    </div>
    <div class="flex flex-col gap-2">
      <input bind:value={title} type="text" placeholder="Titel, z. B. „Formular-Assistent“" class="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
      <textarea
        bind:value={text}
        rows={6}
        placeholder="Anweisungen für das Modell, z. B.: Fülle die Formularfelder der Seite mit den Daten aus dem Kontext …"
        class="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-indigo-500"
      ></textarea>
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
    <h2 class="text-sm font-semibold text-slate-300">Übersicht ({prompts.length})</h2>
    {#if prompts.length === 0}
      <p class="text-xs text-slate-500">Noch keine Systemprompts angelegt.</p>
    {/if}
    {#each prompts as p}
      <div class="rounded-lg border border-slate-800 bg-slate-900/60 p-3">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <span class="block truncate text-sm font-medium text-slate-100">{p.title}</span>
            <p class="mt-1 max-h-16 overflow-hidden whitespace-pre-wrap break-words text-[11px] leading-relaxed text-slate-400">
              {p.prompt}
            </p>
          </div>
          <div class="flex shrink-0 gap-1">
            <button type="button" onclick={() => startEdit(p)} class="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800">Bearbeiten</button>
            <button type="button" onclick={() => copy(p)} class="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-300 hover:bg-slate-800">
              {copiedId === p.id ? 'Kopiert ✓' : 'Kopieren'}
            </button>
            <button type="button" onclick={() => remove(p)} class="rounded border border-rose-800 px-2 py-0.5 text-[10px] text-rose-300 hover:bg-rose-950">Löschen</button>
          </div>
        </div>
      </div>
    {/each}
  </div>
</div>