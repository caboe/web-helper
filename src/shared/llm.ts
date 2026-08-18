// Reine Funktionen für OpenAI-kompatible und Anthropic API-Aufrufe.
// Enthalten KEINE chrome.* APIs, damit sie in Node getestet werden können.
import type { Endpoint, ToolCallSpec } from './types'

export type ApiFormat = 'openai' | 'anthropic'

export interface ToolDef {
  name: string
  description: string
  parameters: Record<string, unknown>
}

export const MAX_TOOL_ITERATIONS = 10

export const DEFAULT_MODEL: Record<ApiFormat, string> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-sonnet-4-20250514',
}

export function detectFormat(endpoint: Pick<Endpoint, 'url' | 'format'>): ApiFormat {
  if (endpoint.format === 'openai' || endpoint.format === 'anthropic') return endpoint.format
  const url = endpoint.url.toLowerCase()
  if (url.includes('anthropic.com') || url.includes('claude')) return 'anthropic'
  return 'openai'
}

export function resolveModel(endpoint: Endpoint, format: ApiFormat): string {
  return endpoint.model.trim() || DEFAULT_MODEL[format]
}

/** Basis-Systeminstruktion, beschreibt Rolle + Tools. */
export function systemInstruction(customPrompt: string, title: string, url: string): string {
  const base = [
    'Du bist ein hilfreicher Assistent, der direkt auf der aktuellen Webseite des Nutzers arbeitet.',
    'Der Nutzer hat dir Inhalte dieser Seite geschickt. Du kannst per Tool-Calling auf der Seite agieren:',
    'Formulare ausfüllen, Elemente klicken, Text ersetzen und Inhalte lesen.',
    'Wird ein markierter Ausschnitt mitgeschickt, ist dieser der primäre Fokus der Aufgabe; die ganze Seite dient als zusätzlicher Kontext.',
    'Nutze Tools nur, wenn es für die Aufgabe sinnvoll ist. Antworte auf Deutsch, kurz und präzise.',
  ].join(' ')
  const custom = customPrompt.trim()
  const header = 'Aktuelle Seite: "' + title + '" (' + url + ')'
  return [custom, header, base].filter(Boolean).join('\n\n')
}

/** Nutzernachricht: ganze Seite als Kontext + optional markierter Ausschnitt als primärer Fokus. */
export function buildUserContent(userContent: string, title: string, url: string, selection?: string): string {
  const parts = ['Seite: ' + title, 'URL: ' + url]
  if (selection && selection.trim()) {
    parts.push('', '--- Markierter Ausschnitt (primärer Fokus) ---')
    parts.push(selection.trim())
  }
  parts.push('', '--- Ganzer Seiteninhalt (Kontext) ---')
  parts.push(userContent)
  return parts.join('\n')
}

// ---------------- OpenAI-kompatible Tool-Definitionen ----------------

function openAiTool(t: ToolDef) {
  return { type: 'function', function: { name: t.name, description: t.description, parameters: t.parameters } }
}

export function openAiTools(tools: ToolDef[]): unknown[] {
  return tools.map(openAiTool)
}

export function openAiRequest(endpoint: Endpoint, opts: { messages: unknown[]; tools: ToolDef[]; maxTokens?: number }): {
  url: string
  headers: Record<string, string>
  body: string
} {
  const format = detectFormat(endpoint)
  return {
    url: endpoint.url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + endpoint.apiKey,
    },
    body: JSON.stringify({
      model: resolveModel(endpoint, format),
      messages: opts.messages,
      tools: openAiTools(opts.tools),
      tool_choice: 'auto',
      max_tokens: opts.maxTokens ?? 4096,
    }),
  }
}

/** Baut die Assistant-Nachricht für den nächsten Request: tool_calls im OpenAI-Wire-Format
 *  ({ id, type: "function", function: { name, arguments } }) – viele APIs (u. a. DeepSeek)
 *  lehnen das flache Format { id, name, arguments } mit HTTP 400 ab. */
export function openAiAssistantMessage(text: string, toolCalls: ToolCallSpec[]): Record<string, unknown> {
  return {
    role: 'assistant',
    content: text || null,
    tool_calls: toolCalls.map((tc) => ({
      id: tc.id,
      type: 'function',
      function: { name: tc.name, arguments: tc.arguments },
    })),
  }
}

export function parseOpenAiResponse(json: unknown): { text: string; toolCalls: ToolCallSpec[] } {
  const data = json as {
    choices?: { message?: { content?: string | null; tool_calls?: { id?: string; function?: { name?: string; arguments?: string } }[] } }[]
  }
  const message = data.choices?.[0]?.message
  const text = message?.content ?? ''
  const toolCalls: ToolCallSpec[] = (message?.tool_calls ?? [])
    .filter((tc) => tc?.function?.name)
    .map((tc, i) => ({
      id: tc.id ?? 'call_' + i,
      name: tc.function!.name! as ToolCallSpec['name'],
      arguments: tc.function!.arguments ?? '{}',
    }))
  return { text, toolCalls }
}

// ---------------- Anthropic Tool-Definitionen ----------------

export function anthropicTools(tools: ToolDef[]): unknown[] {
  return tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }))
}

export function anthropicRequest(endpoint: Endpoint, opts: { messages: unknown[]; system: string; tools: ToolDef[]; maxTokens?: number }): {
  url: string
  headers: Record<string, string>
  body: string
} {
  return {
    url: endpoint.url,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': endpoint.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: resolveModel(endpoint, detectFormat(endpoint)),
      max_tokens: opts.maxTokens ?? 4096,
      system: opts.system,
      messages: opts.messages,
      tools: anthropicTools(opts.tools),
    }),
  }
}

interface AnthropicBlock {
  type?: string
  text?: string
  id?: string
  name?: string
  input?: unknown
}

export function parseAnthropicResponse(json: unknown): { text: string; toolCalls: ToolCallSpec[]; blocks: AnthropicBlock[] } {
  const data = json as { content?: AnthropicBlock[] }
  const blocks = data.content ?? []
  const text = blocks.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('')
  const toolCalls: ToolCallSpec[] = blocks
    .filter((b) => b.type === 'tool_use' && b.id && b.name)
    .map((b, i) => ({
      id: b.id ?? 'toolu_' + i,
      name: b.name as ToolCallSpec['name'],
      arguments: JSON.stringify(b.input ?? {}),
    }))
  return { text, toolCalls, blocks }
}

// ---------------- Gemeinsame Tool-Definitionen ----------------

export const TOOL_DEFS: ToolDef[] = [
  {
    name: 'fill_element',
    description:
      'Füllt ein Formularfeld auf der Seite mit einem Wert: input, textarea, select oder contenteditable. Setzt den Wert und löst die nötigen Events (input/change) aus, sodass auch React/Vue-Formulare reagieren.',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS-Selektor des Feldes, z. B. "#email" oder "input[name=name]".' },
        value: { type: 'string', description: 'Der einzufüllende Wert.' },
      },
      required: ['selector', 'value'],
      additionalProperties: false,
    },
  },
  {
    name: 'click_element',
    description: 'Klickt ein Element auf der Seite (Button, Link, Checkbox …). Scrollt vorher in den Viewport.',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS-Selektor des Elements.' },
      },
      required: ['selector'],
      additionalProperties: false,
    },
  },
  {
    name: 'set_text',
    description:
      'Ersetzt Text auf der Seite: entweder den Inhalt des Elements mit dem angegebenen CSS-Selektor oder – wenn kein Selektor angegeben ist – den aktuell markierten Text des Nutzers.',
    parameters: {
      type: 'object',
      properties: {
        text: { type: 'string', description: 'Der neue Text.' },
        selector: { type: 'string', description: 'Optional: CSS-Selektor des Elements, dessen Inhalt ersetzt wird.' },
      },
      required: ['text'],
      additionalProperties: false,
    },
  },
  {
    name: 'read_content',
    description: 'Liest Textinhalt von der Seite: vom Element mit dem angegebenen Selektor oder – ohne Selektor – von der gesamten Seite (Markdown-ähnlich, gekürzt).',
    parameters: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'Optional: CSS-Selektor des Elements.' },
      },
      required: [],
      additionalProperties: false,
    },
  },
]