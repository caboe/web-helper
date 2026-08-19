# AI Page Actions — Chrome-Erweiterung (MV3)

Svelte 5 + Tailwind CSS 4 + TypeScript (Vite 8).

Seiteninhalte an eigene LLM-Endpunkte senden — mit verwaltbaren Systemprompts und
**Tool-Calling direkt auf der Seite** (Formulare füllen, klicken, Text ersetzen, Inhalte lesen).

## Features

- **LLM-Endpunkte verwalten**: Titel, Endpunkt-URL, API-Key, Modell, Format (Auto / OpenAI-kompatibel / Anthropic).
  Übersicht mit Bearbeiten, Löschen, Kopieren (als JSON) und „Verbindung testen“.
- **Systemprompts verwalten**: Titel + Prompt, mit Bearbeiten, Löschen, Kopieren.
- **Senden**: Text auf der Seite markieren und via Switch **„Auswahl“** oder **„Ganze Seite“**
  (Markdown-ähnliche Extraktion) zusammen mit dem gewählten Systemprompt an den gewählten Endpunkt schicken.
- **Tool-Calling auf der Site**: Das LLM kann per Tool-Calls entscheiden,
  Formularfelder zu befüllen (`fill_element`), Elemente zu klicken (`click_element`),
  Text zu ersetzen (`set_text`) oder Seiteninhalte zu lesen (`read_content`).
- **Ergebnisse**: Kopieren oder direkt an der Markierung in die Seite einfügen.
- Live-Tool-Log im Panel, Modus-/Auswahl-Fallback, Erinnerung der letzten Auswahl.

## Architektur

```
src/
├── shared/            # Typen + LLM-Client (OpenAI & Anthropic, Tool-Definitionen) – ohne chrome.*-APIs (testbar)
├── background/        # MV3 Service Worker: LLM-Aufrufe, Tool-Calling-Loop, Messaging
├── content/           # Content-Script: DOM-Tools, Markdown-Extraktion, Selektion
└── panel/             # Svelte-Side-Panel: Senden / Endpunkte / Prompts
```

Datenfluss: **Panel** → (Port) → **Background** → fetch LLM-API → bei `tool_calls` →
**Content-Script** (DOM-Operation) → Ergebnis zurück → Loop (max. 10 Iterationen) → Antwort ans Panel.

- **UI**: Side Panel auf Chrome ≥ 114/116, automatischer **Popup-Fallback** auf älteren Versionen
  (gleiche Svelte-Oberfläche, Icon-Klick; `chrome.action.setPopup` wird nur bei erfolgreichem Side-Panel-Setup entfernt).
- **OpenAI-kompatibel**: `POST {url}` mit `Authorization: Bearer`, `tools` + `tool_choice: auto`, Tool-Ergebnisse als `role: "tool"`-Messages.
- **Anthropic**: `POST {url}` mit `x-api-key` + `anthropic-version`, `tools` mit `input_schema`, `tool_result`-Blöcke.
- **Auto-Erkennung**: URL enthält `anthropic.com` → Anthropic, sonst OpenAI-kompatibel (abwählbar).
- Daten liegen lokal in `chrome.storage.local` (Endpunkte, Prompts, Einstellungen).

## Installation & Entwicklung

Voraussetzung: Node.js ≥ 20.19.

```bash
npm install
npm run build          # baut nach dist/
npm run dev            # Build mit --watch
npm run check          # svelte-check
npm run typecheck      # tsc --noEmit
npm run test:llm       # Smoke-Tests für den LLM-Client
npm run package        # dist/ → ai-page-actions.zip
```

In Chrome laden: **chrome://extensions** → „Entwicklermodus“ aktivieren →
„Entpackte Erweiterung laden“ → Ordner `dist/` wählen.
Danach erscheint das Icon in der Toolbar; ein Klick öffnet das **Side-Panel**.

> **Side Panel vs. Popup:** Das Side-Panel benötigt Chrome ≥ 114 (Permission „sidePanel“ ≥ 116).
> Auf älteren Versionen öffnet der Icon-Klick automatisch dieselbe Oberfläche als **Popup**
> (Feature-Detection im Service Worker; das Popup bleibt dann aktiv, die „unknown permission“-
> Meldung in chrome://extensions ist dort unkritisch und verschwindet mit einem Chrome-Update).

> Hinweis: Es werden `<all_urls>`-Host-Berechtigungen benötigt (DOM-Tools + Aufruf beliebiger LLM-Endpunkte).
> API-Keys liegen nur lokal im Browser.

## Wichtige Versions-Hinweise

- **svelte-check 4.x + Svelte ≥ 5.5x**: `$props<T>()` wird von svelte-check als `$props(): any` behandelt
  (Svelte deklariert `$props` ohne Generic). Daher in Komponenten die **Annotation-Schreibweise**
  `let { x }: { x: T } = \$props()` verwenden (siehe Komponenten).
- Literal-Union-`\$state`-Felder als `\$state<T>(…)` schreiben, sonst engt TypeScript auf den Initialwert ein.
- `svelte.config.js` bewusst **ohne** `vitePreprocess` (Svelte 5 verarbeitet TS nativ;
  ein Preprocess würde svelte-check die Typen strippen).

## Alternativen

- Der Build nutzt ein schlankes Vite-Multi-Entry-Setup. Wer lieber SvelteKit nutzt:
  [michmich112/sveltekit-adapter-chrome-extension](https://github.com/michmich112/sveltekit-adapter-chrome-extension)
  ist ein etablierter Adapter für Chrome-Erweiterungen mit SvelteKit.