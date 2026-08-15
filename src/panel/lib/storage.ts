import type { Endpoint, Settings, SystemPrompt } from '../../shared/types'

const KEY_ENDPOINTS = 'wh_endpoints'
const KEY_PROMPTS = 'wh_prompts'
const KEY_SETTINGS = 'wh_settings'

export function newId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8)
}

export async function loadEndpoints(): Promise<Endpoint[]> {
  const data = await chrome.storage.local.get(KEY_ENDPOINTS)
  const list = data[KEY_ENDPOINTS]
  return Array.isArray(list) ? (list as Endpoint[]) : []
}

export async function saveEndpoints(list: Endpoint[]): Promise<void> {
  await chrome.storage.local.set({ [KEY_ENDPOINTS]: list })
}

export async function loadPrompts(): Promise<SystemPrompt[]> {
  const data = await chrome.storage.local.get(KEY_PROMPTS)
  const list = data[KEY_PROMPTS]
  return Array.isArray(list) ? (list as SystemPrompt[]) : []
}

export async function savePrompts(list: SystemPrompt[]): Promise<void> {
  await chrome.storage.local.set({ [KEY_PROMPTS]: list })
}

export async function loadSettings(): Promise<Settings> {
  const data = await chrome.storage.local.get(KEY_SETTINGS)
  return (data[KEY_SETTINGS] as Settings) ?? {}
}

export async function saveSettings(s: Settings): Promise<void> {
  await chrome.storage.local.set({ [KEY_SETTINGS]: s })
}
