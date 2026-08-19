# Google Chrome Web Store – Listing for "AI Page Actions" (English)

## Name (max. 75 chars)
AI Page Actions

## Summary / Short Description (max. 132 characters)

Send page content to your own LLM endpoints – system prompts, tool calling and 5 UI languages.

(99 characters)

---

## Detailed Description (English)

**AI Page Actions** turns your browser's side panel into a personal AI assistant for the current website:
send content – a marked selection or the whole page – to your own LLM endpoint and let the model work
directly on the page. The interface is available in **5 languages** (English, German, French, Spanish,
Chinese), detected automatically from your browser settings and overridable in the settings.

#### What you can do
- **Manage LLM endpoints**: add any number of endpoints (OpenAI, Anthropic, OpenRouter, DeepSeek, Kimi,
  Qwen, Gemini, Mistral, Groq, local servers like Ollama …) with API key, model and format. Handy
  **provider templates** pre-fill every field – you only add your API key.
- **Manage actions (system prompts)**: save reusable instructions (e.g. "Form Assistant", "Summarize", "Translate")
  and pick one per request – shown as "Actions" in the UI.
- **Send content**: select text on the page and send the selection – the **whole page is always included
  as context** so the model understands the full picture. Or send the whole page directly (markdown-like
  extraction). Switch with a toggle.
- **Tool calling on the page**: the model can act on the page itself – **fill form fields**, click
  elements, replace text or read content. This enables real workflows like: "Fill the form with the data
  from my selection."
- **Use results**: copy the answer or insert it directly at the selection. A live log shows every tool call.
- **Multilingual**: English, Deutsch, Français, Español and 中文 – auto-detected from the browser, freely
  overridable in Settings → Language.
- **Vision (optional)**: per endpoint, you can enable "Vision" – then a screenshot of the visible page is
  sent with every request alongside the text context, so vision-capable models (GPT-4o, Claude, Gemini, …)
  can also see the actual layout, colors, tables and images.

#### How it works
1. Open the side panel via the toolbar icon (older Chrome versions automatically fall back to a popup).
2. Add your LLM endpoint under Settings → Endpoints (templates help).
3. Select text on any website and send it with your chosen action (system prompt).
4. Watch the tool calls live and insert the answer into the page when needed.

#### Privacy & security
- All data (endpoints, API keys, prompts, settings) stays **strictly local** in your browser (chrome.storage).
- **No data is sent to third parties.** Requests go directly from your browser to the endpoint you configured.
- API keys never leave your browser.
- **Vision is opt-in**: screenshots of the visible page are only sent when you enable the Vision flag on an
  endpoint – and then only to that endpoint.
- The extension needs access to all websites ("<all_urls>") to run DOM tools and reach arbitrary,
  self-configured LLM endpoints.

#### Notes
- Side panel requires Chrome 114+ (permission since 116); older versions automatically use the popup.
- Result quality depends on the chosen model. Local models (e.g. via Ollama) are supported too.
- Sampling parameters (temperature, top_p, penalties) are tuned for natural, varied output where the API supports them.

---

## Category / Suggestions
- Category: **Productivity**
- Languages: UI in 5 languages; listing in English (DE version available on request)
- No external services, no ads, no user-data collection
- Single purpose: AI assistant for processing webpage content with your own LLM endpoints