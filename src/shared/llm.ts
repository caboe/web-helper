// Reine Funktionen für OpenAI-kompatible und Anthropic API-Aufrufe.
// Enthalten KEINE chrome.* APIs, damit sie in Node getestet werden können.
import type { Endpoint, ToolCallSpec } from './types'
import { t, type Locale } from './i18n'

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

/** Sampling-Parameter – nur senden, soweit die API/Modell sie unterstützt.
 *  OpenAI-kompatibel: alle vier · Anthropic: nur temperature + top_p (keine Penalties). */
export const SAMPLING = {
  temperature: 0.9, // Bereich 0.8–1.0: mehr Variabilität
  top_p: 0.92, // Bereich 0.9–0.95: natürlichere Wortwahl
  frequency_penalty: 0.4, // Bereich 0.3–0.5: weniger Wiederholungen
  presence_penalty: 0.4, // Bereich 0.3–0.5: vielfältigere Themen
} as const

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
export function systemInstruction(customPrompt: string, title: string, url: string, locale: Locale = 'de'): string {
  const custom = customPrompt.trim()
  const header = t(locale, 'sysPageTitle', { title }) + ' (' + url + ')'
  return [custom, header, t(locale, 'sysBase')].filter(Boolean).join('\n\n')
}

/** Nutzernachricht: ganze Seite als Kontext + optional markierter Ausschnitt als primärer Fokus. */
export function buildUserContent(userContent: string, title: string, url: string, selection?: string, locale: Locale = 'de'): string {
  const parts = [t(locale, 'sysPageTitle', { title }), t(locale, 'sysUrl', { url })]
  if (selection && selection.trim()) {
    parts.push('', t(locale, 'sysSelectionHeader'))
    parts.push(selection.trim())
  }
  parts.push('', t(locale, 'sysContextHeader'))
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

/** User-Content mit Bild (OpenAI-kompatibel): Text + image_url. */
export function openAiVisionContent(text: string, imageDataUrl: string): unknown[] {
  return [
    { type: 'text', text },
    { type: 'image_url', image_url: { url: imageDataUrl } },
  ]
}

/** User-Content mit Bild (Anthropic): Text + base64-Image-Block. */
export function anthropicVisionContent(text: string, imageDataUrl: string): unknown[] {
  const { mediaType, data } = splitDataUrl(imageDataUrl)
  return [
    { type: 'text', text },
    { type: 'image', source: { type: 'base64', media_type: mediaType, data } },
  ]
}

function splitDataUrl(dataUrl: string): { mediaType: string; data: string } {
  const m = /^data:([^;,]+);base64,(.+)$/s.exec(dataUrl)
  return m ? { mediaType: m[1] ?? 'image/jpeg', data: m[2] ?? '' } : { mediaType: 'image/jpeg', data: dataUrl }
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
      temperature: SAMPLING.temperature,
      top_p: SAMPLING.top_p,
      frequency_penalty: SAMPLING.frequency_penalty,
      presence_penalty: SAMPLING.presence_penalty,
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
      temperature: SAMPLING.temperature,
      top_p: SAMPLING.top_p,
      // frequency_penalty / presence_penalty: Anthropic-API unterstützt sie nicht.
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