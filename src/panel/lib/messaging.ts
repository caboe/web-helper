import type { BackgroundRequest, Endpoint, PageState } from '../../shared/types'
import type { Locale } from '../../shared/i18n'
import { t, getLocale } from './i18n.svelte'

export async function getActiveTabId(): Promise<number> {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  const tab = tabs[0]
  if (!tab?.id) throw new Error(t('errNoTab'))
  return tab.id
}

export async function fetchPageState(tabId: number): Promise<PageState> {
  const req: BackgroundRequest = { kind: 'page-state', tabId, locale: getLocale() }
  const resp = (await chrome.runtime.sendMessage(req)) as { ok: boolean; error?: string; state?: PageState }
  if (!resp?.ok || !resp.state) throw new Error(resp?.error ?? t('errNoPage'))
  return resp.state
}

export async function insertTextIntoPage(tabId: number, text: string, mode: 'replace' | 'insert'): Promise<boolean> {
  const req: BackgroundRequest = { kind: 'insert-text', tabId, text, mode, locale: getLocale() }
  const resp = (await chrome.runtime.sendMessage(req)) as { ok?: boolean }
  return resp?.ok === true
}

export async function testEndpoint(endpoint: Endpoint, locale: Locale): Promise<{ ok: boolean; detail?: string; error?: string }> {
  const req: BackgroundRequest = { kind: 'test-endpoint', endpoint, locale }
  return (await chrome.runtime.sendMessage(req)) as { ok: boolean; detail?: string; error?: string }
}