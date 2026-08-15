import type { BackgroundRequest, Endpoint, PageState } from '../../shared/types'

export async function getActiveTabId(): Promise<number> {
  const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
  const tab = tabs[0]
  if (!tab?.id) throw new Error('Kein aktiver Tab gefunden.')
  return tab.id
}

export async function fetchPageState(tabId: number): Promise<PageState> {
  const req: BackgroundRequest = { kind: 'page-state', tabId }
  const resp = (await chrome.runtime.sendMessage(req)) as { ok: boolean; error?: string; state?: PageState }
  if (!resp?.ok || !resp.state) throw new Error(resp?.error ?? 'Seite nicht erreichbar.')
  return resp.state
}

export async function insertTextIntoPage(tabId: number, text: string, mode: 'replace' | 'insert'): Promise<boolean> {
  const req: BackgroundRequest = { kind: 'insert-text', tabId, text, mode }
  const resp = (await chrome.runtime.sendMessage(req)) as { ok?: boolean }
  return resp?.ok === true
}

export async function testEndpoint(endpoint: Endpoint): Promise<{ ok: boolean; detail?: string; error?: string }> {
  const req: BackgroundRequest = { kind: 'test-endpoint', endpoint }
  return (await chrome.runtime.sendMessage(req)) as { ok: boolean; detail?: string; error?: string }
}
