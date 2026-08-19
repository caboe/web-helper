// Reaktiver Locale-Store für das Panel (Svelte-5-Runes).
import { detectLocale, t as translate, type Locale, type MessageKey, type Vars } from '../../shared/i18n'
import { loadSettings, saveSettings } from './storage'

let current: Locale = $state(detectLocale())

/** Lädt eine in den Settings gespeicherte Überschreibung (sonst Browser-Erkennung). */
export async function initI18n(): Promise<void> {
  const s = await loadSettings()
  if (s.locale) current = s.locale
}

export function getLocale(): Locale {
  return current
}

/** null = zurück zur Browser-Erkennung. */
export function setLocale(locale: Locale | null): void {
  current = locale ?? detectLocale()
  void saveSettings({ locale: locale ?? undefined })
}

export function t(key: MessageKey, vars?: Vars): string {
  return translate(current, key, vars)
}
