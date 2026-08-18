// MV3 Service Worker: vermittelt zwischen Panel und Content-Script,
// führt die LLM-Aufrufe aus und steuert den Tool-Calling-Loop.
import type {
  BackgroundRequest,
  ContentResponse,
  Endpoint,
  LlmRunRequest,
  PortRequest,
  PortUpdate,
  ToolCallSpec,
} from '../shared/types'
import {
  TOOL_DEFS,
  MAX_TOOL_ITERATIONS,
  anthropicRequest,
  buildUserContent,
  detectFormat,
  openAiRequest,
  parseAnthropicResponse,
  parseOpenAiResponse,
  resolveModel,
  systemInstruction,
} from '../shared/llm'

// ---------- Setup ----------

// ---------- UI-Setup: Side Panel (Chrome 114+/116+) mit Popup-Fallback ----------

chrome.runtime.onInstalled.addListener(() => {
  void setupAction()
})

async function setupAction() {
  try {
    // Side-Panel-API vorhanden? (Chrome >= 114)
    if (chrome.sidePanel?.setPanelBehavior) {
      // Erst Side-Panel-Verhalten aktivieren; nur bei Erfolg das Popup entfernen.
      await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
      await chrome.action.setPopup({ popup: '' })
      return
    }
  } catch {
    // Side Panel nicht verfügbar (Permission fehlt o. ä.) -> Popup bleibt aktiv.
  }
  // Fallback: Popup aus der Manifest-Definition wird weiterhin beim Icon-Klick geöffnet.
}

// ---------- Content-Script erreichbar machen ----------

async function ensureContentScript(tabId: number): Promise<boolean> {
  try {
    const resp = (await chrome.tabs.sendMessage(tabId, { kind: 'ping' })) as ContentResponse
    return resp?.kind === 'pong'
  } catch {
    try {
      await chrome.scripting.executeScript({ target: { tabId }, files: ['js/content.js'] })
      const resp = (await chrome.tabs.sendMessage(tabId, { kind: 'ping' })) as ContentResponse
      return resp?.kind === 'pong'
    } catch {
      return false
    }
  }
}

function safeParseArgs(json: string): Record<string, unknown> {
  try {
    const v = JSON.parse(json)
    return v && typeof v === 'object' ? v : {}
  } catch {
    return {}
  }
}

async function callContentTool(tabId: number, call: ToolCallSpec): Promise<{ ok: boolean; output: string }> {
  try {
    const resp = (await chrome.tabs.sendMessage(tabId, {
      kind: 'tool',
      id: call.id,
      name: call.name,
      args: safeParseArgs(call.arguments),
    })) as ContentResponse
    if (resp?.kind === 'tool-result') return { ok: resp.ok, output: resp.output }
    return { ok: false, output: 'Keine Antwort vom Content-Script.' }
  } catch (e) {
    return { ok: false, output: 'Tool-Fehler: ' + String(e) }
  }
}

// ---------- LLM-Lauf ----------

interface ToolResultMsg {
  ok: boolean
  output: string
}

async function runLlmRun(port: chrome.runtime.Port, req: LlmRunRequest): Promise<void> {
  const format = detectFormat(req.endpoint)
  const model = resolveModel(req.endpoint, format)
  const sys = systemInstruction(req.systemPrompt, req.pageTitle, req.pageUrl)
  const user = buildUserContent(req.userContent, req.pageTitle, req.pageUrl, req.selection)
  const tabId = req.tabId
  let toolCallsTotal = 0

  if (format === 'openai') {
    const messages: unknown[] = [
      { role: 'system', content: sys },
      { role: 'user', content: user },
    ]
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const { url, headers, body } = openAiRequest(req.endpoint, { messages, tools: TOOL_DEFS })
      const text = await fetchJson(url, headers, body)
      const parsed = parseOpenAiResponse(text)
      if (parsed.toolCalls.length === 0) {
        port.postMessage({ type: 'done', result: { text: parsed.text, toolCalls: toolCallsTotal, model } } satisfies PortUpdate)
        return
      }
      toolCallsTotal += parsed.toolCalls.length
      messages.push({ role: 'assistant', content: parsed.text || null, tool_calls: parsed.toolCalls })
      port.postMessage({ type: 'progress', message: parsed.toolCalls.length + ' Tool-Aufruf(e) erkannt …' } satisfies PortUpdate)
      for (const call of parsed.toolCalls) {
        const r = await callContentTool(tabId, call)
        port.postMessage({ type: 'tool', name: call.name, args: call.arguments, result: r.output } satisfies PortUpdate)
        messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(r satisfies ToolResultMsg) })
      }
    }
    throw new Error('Zu viele Tool-Iterationen (' + MAX_TOOL_ITERATIONS + ').')
  }

  // Anthropic
  const messages: unknown[] = [{ role: 'user', content: user }]
  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const { url, headers, body } = anthropicRequest(req.endpoint, { messages, system: sys, tools: TOOL_DEFS })
    const json = await fetchJson(url, headers, body)
    const parsed = parseAnthropicResponse(json)
    if (parsed.toolCalls.length === 0) {
      port.postMessage({ type: 'done', result: { text: parsed.text, toolCalls: toolCallsTotal, model } } satisfies PortUpdate)
      return
    }
    toolCallsTotal += parsed.toolCalls.length
    messages.push({ role: 'assistant', content: parsed.blocks })
    port.postMessage({ type: 'progress', message: parsed.toolCalls.length + ' Tool-Aufruf(e) erkannt …' } satisfies PortUpdate)
    for (const call of parsed.toolCalls) {
      const r = await callContentTool(tabId, call)
      port.postMessage({ type: 'tool', name: call.name, args: call.arguments, result: r.output } satisfies PortUpdate)
      messages.push({ role: 'user', content: [{ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(r satisfies ToolResultMsg) }] })
    }
  }
  throw new Error('Zu viele Tool-Iterationen (' + MAX_TOOL_ITERATIONS + ').')
}

async function fetchJson(url: string, headers: Record<string, string>, body: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 120_000)
  try {
    const resp = await fetch(url, { method: 'POST', headers, body, signal: controller.signal })
    const text = await resp.text()
    if (!resp.ok) {
      throw new Error('HTTP ' + resp.status + ' von ' + url + ': ' + text.slice(0, 400))
    }
    try {
      return JSON.parse(text)
    } catch {
      throw new Error('Ungültige JSON-Antwort von ' + url)
    }
  } finally {
    clearTimeout(timer)
  }
}

// ---------- Panel-Verbindung (Port) ----------

chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'llm') return
  port.onMessage.addListener((msg: PortRequest) => {
    if (msg?.kind !== 'llm-run') return
    ;(async () => {
      try {
        const ok = await ensureContentScript(msg.tabId)
        if (!ok) {
          throw new Error('Kein Zugriff auf diese Seite (Content-Script nicht verfügbar). chrome://-Seiten werden nicht unterstützt.')
        }
        await runLlmRun(port, msg)
      } catch (e) {
        try {
          port.postMessage({ type: 'error', error: String(e) } satisfies PortUpdate)
        } catch {
          /* Port schon geschlossen */
        }
      }
    })()
  })
})

// ---------- Einzelne Anfragen (Panel -> Background) ----------

chrome.runtime.onMessage.addListener((msg: BackgroundRequest, _sender, sendResponse) => {
  ;(async () => {
    try {
      switch (msg?.kind) {
        case 'ensure-content': {
          const ok = await ensureContentScript(msg.tabId)
          sendResponse({ ok })
          return
        }
        case 'page-state': {
          const ok = await ensureContentScript(msg.tabId)
          if (!ok) {
            sendResponse({ ok: false, error: 'Kein Zugriff auf diese Seite.' })
            return
          }
          const resp = (await chrome.tabs.sendMessage(msg.tabId, { kind: 'get-state' })) as ContentResponse
          sendResponse({ ok: resp?.kind === 'state', state: resp?.kind === 'state' ? resp.state : undefined })
          return
        }
        case 'insert-text': {
          const ok = await ensureContentScript(msg.tabId)
          if (!ok) {
            sendResponse({ ok: false })
            return
          }
          const resp = (await chrome.tabs.sendMessage(msg.tabId, { kind: 'insert-text', text: msg.text, mode: msg.mode })) as ContentResponse
          sendResponse({ ok: resp?.kind === 'insert-result' && resp.ok })
          return
        }
        case 'test-endpoint': {
          sendResponse(await testEndpoint(msg.endpoint))
          return
        }
        default:
          sendResponse({ ok: false, error: 'Unbekannte Anfrage' })
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e) })
    }
  })()
  return true // async
})

async function testEndpoint(endpoint: Endpoint): Promise<{ ok: boolean; error?: string; detail?: string }> {
  const format = detectFormat(endpoint)
  const sys = systemInstruction('Antworte nur mit: OK', 'Test', 'test')
  try {
    if (format === 'openai') {
      const { url, headers, body } = openAiRequest(endpoint, {
        messages: [
          { role: 'system', content: sys },
          { role: 'user', content: 'ping' },
        ],
        tools: [],
        maxTokens: 16,
      })
      const json = (await fetchJson(url, headers, body)) as { model?: string }
      return { ok: true, detail: json.model }
    }
    const { url, headers, body } = anthropicRequest(endpoint, {
      messages: [{ role: 'user', content: 'ping' }],
      system: sys,
      tools: [],
      maxTokens: 16,
    })
    const json = (await fetchJson(url, headers, body)) as { model?: string }
    return { ok: true, detail: json.model }
  } catch (e) {
    return { ok: false, error: String(e) }
  }
}