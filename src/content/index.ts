// Content-Script: läuft auf jeder Seite und stellt DOM-Tools bereit.
// WICHTIG: keine Laufzeit-Imports (klassisches Skript, kein Modul).
import type { ContentRequest, ContentResponse, DomToolName, PageState } from '../shared/types'

const INJECTION_KEY = '__webHelperAiInjected'

declare global {
  interface Window {
    [INJECTION_KEY]?: boolean
  }
}

if (!window[INJECTION_KEY]) {
  window[INJECTION_KEY] = true

  // ---------- letzte Markierung merken ----------
  interface SavedSelection {
    anchorNode: Node | null
    anchorOffset: number
    focusNode: Node | null
    focusOffset: number
  }
  let lastSelection: SavedSelection | null = null

  document.addEventListener('selectionchange', () => {
    const s = window.getSelection()
    if (s && s.rangeCount > 0 && !s.isCollapsed) {
      lastSelection = {
        anchorNode: s.anchorNode,
        anchorOffset: s.anchorOffset,
        focusNode: s.focusNode,
        focusOffset: s.focusOffset,
      }
    }
  })

  function currentSelectionText(): string {
    return (window.getSelection()?.toString() ?? '').trim()
  }

  function restoreSelection(): Range | null {
    if (!lastSelection) return null
    const { anchorNode, anchorOffset, focusNode, focusOffset } = lastSelection
    if (!anchorNode || !focusNode) return null
    try {
      const range = document.createRange()
      range.setStart(anchorNode, anchorOffset)
      range.setEnd(focusNode, focusOffset)
      return range
    } catch {
      return null
    }
  }

  // ---------- Markdown-ähnliche Extraktion ----------

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'NOSCRIPT', 'SVG', 'IFRAME', 'CANVAS', 'TEMPLATE', 'META', 'LINK', 'TITLE', 'HEAD', 'VIDEO', 'AUDIO', 'SOURCE', 'PATH', 'NAV',
  ])

  const MAX_EXTRACT_CHARS = 120_000

  function fieldLabel(el: HTMLElement): string {
    const name = el.getAttribute('name') || el.getAttribute('id') || el.getAttribute('aria-label') || el.tagName.toLowerCase()
    return name
  }

  function describeField(el: HTMLElement): string | null {
    const tag = el.tagName
    if (tag === 'INPUT') {
      const input = el as HTMLInputElement
      if (input.type === 'hidden') return null
      const placeholder = input.placeholder ? ' (' + input.placeholder + ')' : ''
      const val = input.type === 'checkbox' || input.type === 'radio' ? (input.checked ? 'angehakt' : 'leer') : input.value
      return '[Feld ' + fieldLabel(el) + placeholder + ': ' + (val || 'leer') + ']'
    }
    if (tag === 'TEXTAREA') {
      const ta = el as HTMLTextAreaElement
      return '[Feld ' + fieldLabel(el) + ' (Textarea): ' + (ta.value || 'leer') + ']'
    }
    if (tag === 'SELECT') {
      const sel = el as HTMLSelectElement
      const opts = Array.from(sel.options).map((o) => o.text)
      return '[Feld ' + fieldLabel(el) + ' (Select): ' + (sel.value || 'leer') + ' | Optionen: ' + opts.join(', ') + ']'
    }
    return null
  }

  function extractMarkdown(): string {
    const parts: string[] = []
    const push = (t: string) => {
      const clean = t.replace(/[\t\r\n ]+/g, ' ').trim()
      if (clean) parts.push(clean)
    }

    const visit = (node: Node) => {
      if (parts.join('\n').length > MAX_EXTRACT_CHARS) return
      if (node.nodeType === Node.TEXT_NODE) {
        push(node.textContent ?? '')
        return
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return
      const el = node as HTMLElement
      const tag = el.tagName
      if (SKIP_TAGS.has(tag)) return
      if (tag === 'IMG') {
        const alt = (el as HTMLImageElement).alt?.trim()
        if (alt) parts.push('[Bild: ' + alt + ']')
        return
      }
      if (tag === 'A') {
        const href = (el as HTMLAnchorElement).href
        const text = (el.textContent ?? '').trim()
        if (text && href && !href.startsWith('javascript:')) parts.push(text + ' (' + href + ')')
        else if (text) parts.push(text)
        return
      }
      if (tag === 'BR') return
      const field = describeField(el)
      if (field) {
        parts.push(field)
        return
      }
      if (tag === 'H1') { const t = (el.textContent ?? '').trim(); if (t) { parts.push(''); parts.push('# ' + t) } return }
      if (tag === 'H2') { const t = (el.textContent ?? '').trim(); if (t) { parts.push(''); parts.push('## ' + t) } return }
      if (tag === 'H3') { const t = (el.textContent ?? '').trim(); if (t) { parts.push(''); parts.push('### ' + t) } return }
      if (tag === 'H4' || tag === 'H5' || tag === 'H6') { const t = (el.textContent ?? '').trim(); if (t) { parts.push(''); parts.push('#### ' + t) } return }
      if (tag === 'LI') {
        const t = (el.textContent ?? '').trim()
        if (t) parts.push('- ' + t)
        return
      }
      if (tag === 'HR') { parts.push(''); parts.push('---'); return }
      if (tag === 'PRE' || tag === 'CODE') {
        const t = (el.textContent ?? '').trim()
        const fence = String.fromCharCode(96, 96, 96)
        if (t) { parts.push(''); parts.push(fence); parts.push(t); parts.push(fence); parts.push('') }
        return
      }
      // Standard: Kinder rekursiv besuchen
      for (let i = 0; i < el.childNodes.length; i++) visit(el.childNodes[i]!)
    }

    visit(document.body)
    let text = parts.join('\n').replace(/\n{3,}/g, '\n\n').trim()
    if (text.length > MAX_EXTRACT_CHARS) text = text.slice(0, MAX_EXTRACT_CHARS) + '\n… (gekürzt)'
    return text
  }

  function readElementText(selector: string): string {
    const el = querySelector(selector)
    if (!el) throw new Error('Element nicht gefunden: ' + selector)
    const text = (el as HTMLElement).innerText || el.textContent || ''
    return text.trim().slice(0, MAX_EXTRACT_CHARS)
  }

  // ---------- Tool-Ausführung ----------

  function querySelector(selector: string): Element | null {
    try {
      return document.querySelector(selector)
    } catch {
      return null
    }
  }

  function dispatchEvents(el: Element) {
    el.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  }

  function setNativeValue(input: HTMLInputElement | HTMLTextAreaElement, value: string) {
    const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    const desc = Object.getOwnPropertyDescriptor(proto, 'value')
    if (desc && desc.set) desc.set.call(input, value)
    else input.value = value
  }

  function fillElement(selector: string, value: string): string {
    const el = querySelector(selector)
    if (!el) throw new Error('Element nicht gefunden: ' + selector)
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      setNativeValue(el, value)
      dispatchEvents(el)
      return 'OK: ' + selector + ' gesetzt auf "' + value.slice(0, 100) + '"'
    }
    if (el instanceof HTMLSelectElement) {
      el.value = value
      dispatchEvents(el)
      return 'OK: Select ' + selector + ' auf "' + value + '" gesetzt'
    }
    if ((el as HTMLElement).isContentEditable) {
      el.textContent = value
      dispatchEvents(el)
      return 'OK: contenteditable ' + selector + ' befüllt'
    }
    // Fallback: direkt schreiben
    ;(el as HTMLElement).textContent = value
    dispatchEvents(el)
    return 'OK: ' + selector + ' befüllt (Fallback)'
  }

  function clickElement(selector: string): string {
    const el = querySelector(selector)
    if (!el) throw new Error('Element nicht gefunden: ' + selector)
    const target = el as HTMLElement
    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
    target.click()
    return 'OK: ' + selector + ' geklickt'
  }

  function setText(text: string, selector?: string): string {
    if (selector) {
      const el = querySelector(selector)
      if (!el) throw new Error('Element nicht gefunden: ' + selector)
      ;(el as HTMLElement).innerText = text
      dispatchEvents(el)
      return 'OK: Inhalt von ' + selector + ' ersetzt'
    }
    // markierten Text ersetzen
    const range = restoreSelection()
    if (range) {
      range.deleteContents()
      range.insertNode(document.createTextNode(text))
      return 'OK: Markierung durch neuen Text ersetzt'
    }
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const r = sel.getRangeAt(0)
      r.deleteContents()
      r.insertNode(document.createTextNode(text))
      return 'OK: aktuelle Markierung ersetzt'
    }
    throw new Error('Kein Element-Selektor und keine Markierung vorhanden.')
  }

  async function runTool(name: DomToolName, args: Record<string, unknown>): Promise<{ ok: boolean; output: string }> {
    try {
      let output: string
      switch (name) {
        case 'fill_element':
          output = fillElement(String(args.selector ?? ''), String(args.value ?? ''))
          break
        case 'click_element':
          output = clickElement(String(args.selector ?? ''))
          break
        case 'set_text':
          output = setText(String(args.text ?? ''), args.selector ? String(args.selector) : undefined)
          break
        case 'read_content':
          output = args.selector ? readElementText(String(args.selector)) : extractMarkdown()
          break
        default:
          throw new Error('Unbekanntes Tool: ' + name)
      }
      return { ok: true, output }
    } catch (e) {
      return { ok: false, output: String(e) }
    }
  }

  async function insertText(text: string, mode: 'replace' | 'insert'): Promise<boolean> {
    const range = restoreSelection()
    const sel = window.getSelection()
    const useRange = range ?? (sel && sel.rangeCount > 0 && !sel.isCollapsed ? sel.getRangeAt(0) : null)
    if (useRange) {
      if (mode === 'replace' && !useRange.collapsed) useRange.deleteContents()
      useRange.deleteContents()
      const node = document.createTextNode(text)
      useRange.insertNode(node)
      useRange.collapse(false)
      sel?.removeAllRanges()
      const r2 = document.createRange()
      r2.setStartAfter(node)
      sel?.addRange(r2)
      return true
    }
    // kein Range: am Ende des Body anhängen
    const p = document.createElement('p')
    p.textContent = text
    document.body.appendChild(p)
    p.scrollIntoView({ block: 'center' })
    return true
  }

  // ---------- Message-Handler ----------

  function pageState(): PageState {
    return {
      title: document.title,
      url: location.href,
      selection: currentSelectionText(),
      markdown: extractMarkdown(),
      hasSelection: currentSelectionText().length > 0,
    }
  }

  async function handle(msg: ContentRequest): Promise<ContentResponse> {
    switch (msg.kind) {
      case 'ping':
        return { kind: 'pong' }
      case 'get-state':
        return { kind: 'state', state: pageState() }
      case 'tool': {
        const r = await runTool(msg.name, msg.args)
        return { kind: 'tool-result', id: msg.id, ok: r.ok, output: r.output }
      }
      case 'insert-text': {
        const ok = await insertText(msg.text, msg.mode)
        return { kind: 'insert-result', ok }
      }
    }
  }

  chrome.runtime.onMessage.addListener((msg: ContentRequest, _sender, sendResponse) => {
    handle(msg).then(sendResponse).catch((e) => sendResponse({ kind: 'tool-result', id: '', ok: false, output: String(e) }))
    return true // async
  })

  console.log('[Web Helper AI] Content-Script aktiv')
}
