// Gemeinsame Typen für Panel, Background und Content-Script.
import type { Locale } from './i18n'

export type EndpointFormat = 'auto' | 'openai' | 'anthropic'

export interface Endpoint {
  id: string
  title: string
  url: string
  apiKey: string
  model: string
  format: EndpointFormat
}

export interface SystemPrompt {
  id: string
  title: string
  prompt: string
}

export interface Settings {
  endpointId?: string
  promptId?: string
  mode?: 'selection' | 'page'
  /** Überschriebene Oberflächensprache; undefined = Browser-Erkennung. */
  locale?: Locale
  /** Wurden die Standard-Prompts bereits einmal angelegt? (verhindert erneutes Seeding nach Löschen) */
  promptsSeeded?: boolean
}

/** Von der Seite extrahierter Zustand, den das Panel anzeigt. */
export interface PageState {
  title: string
  url: string
  selection: string
  markdown: string
  hasSelection: boolean
}

export type DomToolName = 'fill_element' | 'click_element' | 'set_text' | 'read_content'

export interface ToolCallSpec {
  id: string
  name: DomToolName
  arguments: string // JSON-String
}

// ---------- Port-Protokoll (Panel <-> Background) ----------

export interface LlmRunRequest {
  endpoint: Endpoint
  systemPrompt: string
  /** Seiteninhalt der ganzen Seite (Markdown-ähnlich) – immer als Kontext enthalten. */
  userContent: string
  /** Optional: markierter Ausschnitt – primärer Fokus, falls vorhanden. */
  selection?: string
  pageUrl: string
  pageTitle: string
  tabId: number
  /** Oberflächensprache (für lokalisierte System-Prompt-Basis und Fehlermeldungen). */
  locale: Locale
}

export interface LlmRunResult {
  text: string
  toolCalls: number
  model: string
}

export type PortRequest = { kind: 'llm-run' } & LlmRunRequest

export type PortUpdate =
  | { type: 'progress'; message: string }
  | { type: 'tool'; name: string; args: string; result: string }
  | { type: 'done'; result: LlmRunResult }
  | { type: 'error'; error: string }

// ---------- Message-Protokoll (Background <-> Content-Script) ----------

export type ContentRequest =
  | { kind: 'ping' }
  | { kind: 'get-state' }
  | { kind: 'tool'; id: string; name: DomToolName; args: Record<string, unknown>; locale: Locale }
  | { kind: 'insert-text'; text: string; mode: 'replace' | 'insert' }

export type ContentResponse =
  | { kind: 'pong' }
  | { kind: 'state'; state: PageState }
  | { kind: 'tool-result'; id: string; ok: boolean; output: string }
  | { kind: 'insert-result'; ok: boolean }

// ---------- Background-Messages (Panel -> Background) ----------

export type BackgroundRequest =
  | { kind: 'page-state'; tabId: number; locale: Locale }
  | { kind: 'ensure-content'; tabId: number; locale: Locale }
  | { kind: 'insert-text'; tabId: number; text: string; mode: 'replace' | 'insert'; locale: Locale }
  | { kind: 'test-endpoint'; endpoint: Endpoint; locale: Locale }