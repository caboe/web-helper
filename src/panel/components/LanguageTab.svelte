<script lang="ts">
  import { LOCALES } from '../../shared/i18n'
  import { getLocale, setLocale, t } from '../lib/i18n.svelte'
  import { localeLabel } from '../../shared/i18n'

  let selected = $state<string>(getLocale())
</script>

<div class="flex flex-col gap-4 p-4">
  <div class="rounded-2xl bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,0.04),0_6px_16px_rgba(24,24,27,0.06)]">
    <h2 class="text-sm font-semibold text-zinc-900">{t('languageTitle')}</h2>
    <p class="mt-1 text-[11px] leading-relaxed text-zinc-500">{t('languageHint')}</p>
  </div>

  <div class="flex flex-col gap-1.5">
    <button
      type="button"
      onclick={() => {
        selected = ''
        setLocale(null)
      }}
      class="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(24,24,27,0.04),0_4px_12px_rgba(24,24,27,0.05)] transition hover:bg-zinc-50"
      class:ring-2={selected === ''}
      class:ring-indigo-400={selected === ''}
    >
      <div>
        <div class="text-sm font-medium text-zinc-900">{t('languageDefault')}</div>
        <div class="mt-0.5 text-[11px] text-zinc-400">{t('languageDetected', { lang: localeLabel(getLocale()) })}</div>
      </div>
      {#if selected === ''}
        <span class="text-indigo-600">✓</span>
      {/if}
    </button>

    {#each LOCALES as l}
      <button
        type="button"
        onclick={() => {
          selected = l.code
          setLocale(l.code)
        }}
        class="flex items-center justify-between rounded-2xl bg-white px-4 py-3 text-left shadow-[0_1px_2px_rgba(24,24,27,0.04),0_4px_12px_rgba(24,24,27,0.05)] transition hover:bg-zinc-50"
        class:ring-2={selected === l.code}
        class:ring-indigo-400={selected === l.code}
      >
        <div class="text-sm font-medium text-zinc-900">{l.label}</div>
        {#if selected === l.code}
          <span class="text-indigo-600">✓</span>
        {/if}
      </button>
    {/each}
  </div>
</div>