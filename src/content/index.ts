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

  // ---------- lokale Tool-Meldungen (5 Sprachen) ----------
  type CsKey = 'elementNotFound' | 'filled' | 'selectFilled' | 'contentEditable' | 'filledFallback' | 'clicked' | 'textReplaced' | 'selectionReplaced' | 'selectionReplacedNow' | 'noSelectorOrSelection' | 'unknownTool'
  const CS_MSGS: Record<string, Record<CsKey, string>> = {
    de: {
      elementNotFound: 'Element nicht gefunden: {s}',
      filled: 'OK: {s} gesetzt auf "{v}"',
      selectFilled: 'OK: Select {s} auf "{v}" gesetzt',
      contentEditable: 'OK: contenteditable {s} befüllt',
      filledFallback: 'OK: {s} befüllt (Fallback)',
      clicked: 'OK: {s} geklickt',
      textReplaced: 'OK: Inhalt von {s} ersetzt',
      selectionReplaced: 'OK: Markierung durch neuen Text ersetzt',
      selectionReplacedNow: 'OK: aktuelle Markierung ersetzt',
      noSelectorOrSelection: 'Kein Element-Selektor und keine Markierung vorhanden.',
      unknownTool: 'Unbekanntes Tool: {s}',
    },
    en: {
      elementNotFound: 'Element not found: {s}',
      filled: 'OK: {s} set to "{v}"',
      selectFilled: 'OK: select {s} set to "{v}"',
      contentEditable: 'OK: contenteditable {s} filled',
      filledFallback: 'OK: {s} filled (fallback)',
      clicked: 'OK: {s} clicked',
      textReplaced: 'OK: content of {s} replaced',
      selectionReplaced: 'OK: selection replaced with new text',
      selectionReplacedNow: 'OK: current selection replaced',
      noSelectorOrSelection: 'No element selector and no selection available.',
      unknownTool: 'Unknown tool: {s}',
    },
    fr: {
      elementNotFound: 'Élément introuvable : {s}',
      filled: 'OK : {s} défini sur « {v} »',
      selectFilled: 'OK : sélecteur {s} défini sur « {v} »',
      contentEditable: 'OK : contenteditable {s} rempli',
      filledFallback: 'OK : {s} rempli (solution de repli)',
      clicked: 'OK : {s} cliqué',
      textReplaced: 'OK : contenu de {s} remplacé',
      selectionReplaced: 'OK : sélection remplacée par le nouveau texte',
      selectionReplacedNow: 'OK : sélection actuelle remplacée',
      noSelectorOrSelection: 'Aucun sélecteur d’élément et aucune sélection disponibles.',
      unknownTool: 'Outil inconnu : {s}',
    },
    es: {
      elementNotFound: 'Elemento no encontrado: {s}',
      filled: 'OK: {s} establecido en «{v}»',
      selectFilled: 'OK: selector {s} establecido en «{v}»',
      contentEditable: 'OK: contenteditable {s} rellenado',
      filledFallback: 'OK: {s} rellenado (respaldo)',
      clicked: 'OK: {s} clicado',
      textReplaced: 'OK: contenido de {s} reemplazado',
      selectionReplaced: 'OK: selección reemplazada por el nuevo texto',
      selectionReplacedNow: 'OK: selección actual reemplazada',
      noSelectorOrSelection: 'No hay selector de elemento ni selección disponibles.',
      unknownTool: 'Herramienta desconocida: {s}',
    },
    zh: {
      elementNotFound: '未找到元素：{s}',
      filled: 'OK：{s} 已设置为“{v}”',
      selectFilled: 'OK：选择框 {s} 已设置为“{v}”',
      contentEditable: 'OK：可编辑元素 {s} 已填充',
      filledFallback: 'OK：{s} 已填充（备用方案）',
      clicked: 'OK：{s} 已点击',
      textReplaced: 'OK：{s} 的内容已替换',
      selectionReplaced: 'OK：选区已替换为新文本',
      selectionReplacedNow: 'OK：当前选区已替换',
      noSelectorOrSelection: '没有元素选择器，也没有可用选区。',
      unknownTool: '未知工具：{s}',
    },
  }
  function cs(locale: string, key: CsKey, vars?: Record<string, string>): string {
    let s: string = CS_MSGS[locale]?.[key] ?? CS_MSGS['de']?.[key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) s = s.split('{' + k + '}').join(v)
    }
    return s
  }

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
    if (!el) throw new Error(cs(currentLocale, 'elementNotFound', { s: selector }))
    const text = (el as HTMLElement).innerText || el.textContent || ''
    return text.trim().slice(0, MAX_EXTRACT_CHARS)
  }

  // ---------- Tool-Ausführung ----------
  let currentLocale = 'de'

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
    if (!el) throw new Error(cs(currentLocale, 'elementNotFound', { s: selector }))
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      setNativeValue(el, value)
      dispatchEvents(el)
      return cs(currentLocale, 'filled', { s: selector, v: value.slice(0, 100) })
    }
    if (el instanceof HTMLSelectElement) {
      el.value = value
      dispatchEvents(el)
      return cs(currentLocale, 'selectFilled', { s: selector, v: value })
    }
    if ((el as HTMLElement).isContentEditable) {
      el.textContent = value
      dispatchEvents(el)
      return cs(currentLocale, 'contentEditable', { s: selector })
    }
    // Fallback: direkt schreiben
    ;(el as HTMLElement).textContent = value
    dispatchEvents(el)
    return cs(currentLocale, 'filledFallback', { s: selector })
  }

  function clickElement(selector: string): string {
    const el = querySelector(selector)
    if (!el) throw new Error(cs(currentLocale, 'elementNotFound', { s: selector }))
    const target = el as HTMLElement
    target.scrollIntoView({ block: 'center', behavior: 'smooth' })
    target.click()
    return cs(currentLocale, 'clicked', { s: selector })
  }

  function setText(text: string, selector?: string): string {
    if (selector) {
      const el = querySelector(selector)
      if (!el) throw new Error(cs(currentLocale, 'elementNotFound', { s: selector }))
      ;(el as HTMLElement).innerText = text
      dispatchEvents(el)
      return cs(currentLocale, 'textReplaced', { s: selector })
    }
    // markierten Text ersetzen
    const range = restoreSelection()
    if (range) {
      range.deleteContents()
      range.insertNode(document.createTextNode(text))
      return cs(currentLocale, 'selectionReplaced')
    }
    const sel = window.getSelection()
    if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
      const r = sel.getRangeAt(0)
      r.deleteContents()
      r.insertNode(document.createTextNode(text))
      return cs(currentLocale, 'selectionReplacedNow')
    }
    throw new Error(cs(currentLocale, 'noSelectorOrSelection'))
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
          throw new Error(cs(currentLocale, 'unknownTool', { s: name }))
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
        currentLocale = msg.locale ?? 'de'
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