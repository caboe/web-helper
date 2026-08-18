// Smoke-Test für den LLM-Client (src/shared/llm.ts) ohne chrome.*-Abhängigkeiten.
import { execSync } from 'node:child_process'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const out = '/tmp/llm-test'
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
execSync('npx tsc src/shared/llm.ts --outDir ' + out + ' --module esnext --moduleResolution bundler --target es2022 --strict --skipLibCheck --erasableSyntaxOnly', { stdio: 'pipe' })

const m = await import('file://' + out + '/llm.js')
const { detectFormat, openAiRequest, parseOpenAiResponse, anthropicRequest, parseAnthropicResponse, systemInstruction, buildUserContent, TOOL_DEFS, DEFAULT_MODEL, MAX_TOOL_ITERATIONS } = m

let failures = 0
function check(name, cond, detail) {
  if (cond) console.log('  ✓', name)
  else { failures++; console.log('  ✗', name, '→', detail) }
}

const openaiEp = { id: '1', title: 'OpenAI', url: 'https://api.openai.com/v1/chat/completions', apiKey: 'sk-test', model: '', format: 'auto' }
const anthropicEp = { id: '2', title: 'Claude', url: 'https://api.anthropic.com/v1/messages', apiKey: 'ant-test', model: '', format: 'auto' }
const ollamaEp = { id: '3', title: 'Ollama', url: 'http://localhost:11434/v1/chat/completions', apiKey: 'ollama', model: 'llama3.2', format: 'auto' }

console.log('Format-Erkennung:')
check('OpenAI-URL → openai', detectFormat(openaiEp) === 'openai', detectFormat(openaiEp))
check('Anthropic-URL → anthropic', detectFormat(anthropicEp) === 'anthropic', detectFormat(anthropicEp))
check('Ollama-URL → openai', detectFormat(ollamaEp) === 'openai', detectFormat(ollamaEp))
check('explizit openai überschreibt auto', detectFormat({ ...anthropicEp, format: 'openai' }) === 'openai')

console.log('OpenAI-Request:')
const oa = openAiRequest(openaiEp, { messages: [{ role: 'user', content: 'hi' }], tools: TOOL_DEFS })
const oaBody = JSON.parse(oa.body)
check('Authorization: Bearer', oa.headers.Authorization === 'Bearer sk-test', oa.headers.Authorization)
check('Default-Modell', oaBody.model === DEFAULT_MODEL.openai, oaBody.model)
check('messages enthalten', oaBody.messages.length === 1 && oaBody.messages[0].role === 'user')
check('tools = 4 Funktionen', oaBody.tools.length === 4, oaBody.tools.length)
check('tool_choice auto', oaBody.tool_choice === 'auto')
const toolNames = oaBody.tools.map((t) => t.function.name).sort()
check('Tool-Namen korrekt', JSON.stringify(toolNames) === JSON.stringify(['click_element', 'fill_element', 'read_content', 'set_text']), toolNames)
check('Fill-Tool-Schema hat properties', !!oaBody.tools.find((t) => t.function.name === 'fill_element').function.parameters.properties.selector)

console.log('OpenAI-Response-Parsing:')
const oaResp = parseOpenAiResponse({
  choices: [{
    message: {
      content: 'Hallo',
      tool_calls: [
        { id: 'call_1', function: { name: 'fill_element', arguments: '{"selector":"#name","value":"Max"}' } },
        { id: 'call_2', function: { name: 'click_element', arguments: '{"selector":"#submit"}' } },
      ],
    },
  }],
})
check('Text extrahiert', oaResp.text === 'Hallo', oaResp.text)
check('2 Tool-Calls erkannt', oaResp.toolCalls.length === 2, oaResp.toolCalls.length)
check('Tool-Args JSON übernommen', oaResp.toolCalls[0].arguments === '{"selector":"#name","value":"Max"}')
check('Tool-Call-ID', oaResp.toolCalls[0].id === 'call_1')
const oaNoTools = parseOpenAiResponse({ choices: [{ message: { content: 'fertig' } }] })
check('ohne Tool-Calls', oaNoTools.toolCalls.length === 0 && oaNoTools.text === 'fertig')

console.log('Anthropic-Request:')
const an = anthropicRequest(anthropicEp, { messages: [{ role: 'user', content: 'hi' }], system: 'sys', tools: TOOL_DEFS })
const anBody = JSON.parse(an.body)
check('x-api-key Header', an.headers['x-api-key'] === 'ant-test', an.headers['x-api-key'])
check('anthropic-version Header', an.headers['anthropic-version'] === '2023-06-01')
check('Default-Modell Claude', anBody.model === DEFAULT_MODEL.anthropic, anBody.model)
check('system Parameter', anBody.system === 'sys')
check('tools mit input_schema', anBody.tools.length === 4 && !!anBody.tools[0].input_schema, JSON.stringify(anBody.tools[0]).slice(0, 60))
check('max_tokens', anBody.max_tokens === 4096)

console.log('Anthropic-Response-Parsing:')
const anResp = parseAnthropicResponse({
  content: [
    { type: 'text', text: 'Ich ' },
    { type: 'text', text: 'helfe.' },
    { type: 'tool_use', id: 'toolu_1', name: 'set_text', input: { text: 'neu' } },
  ],
})
check('Text-Blöcke joinen', anResp.text === 'Ich helfe.', anResp.text)
check('tool_use erkannt', anResp.toolCalls.length === 1 && anResp.toolCalls[0].name === 'set_text', JSON.stringify(anResp.toolCalls))
check('tool_use Input als JSON', anResp.toolCalls[0].arguments === '{"text":"neu"}', anResp.toolCalls[0].arguments)

console.log('Systeminstruktion:')
const sys = systemInstruction('Sei präzise.', 'Meine Seite', 'https://example.com')
check('Custom-Prompt enthalten', sys.includes('Sei präzise.'))
check('Seitentitel enthalten', sys.includes('Meine Seite'))
check('Basis-Regeln enthalten', sys.includes('Tool-Calling'))
const user = buildUserContent('INHALT', 'Titel', 'url')
check('User-Content korrekt', user.includes('INHALT') && user.includes('Seite: Titel'))
const userSel = buildUserContent('INHALT', 'Titel', 'url', 'AUSWAHL')
check('Auswahl als primärer Fokus', userSel.includes('AUSWAHL') && userSel.includes('primärer Fokus'))
check('Seite als Kontext enthalten', userSel.includes('INHALT') && userSel.includes('Kontext'))
check('ohne Auswahl kein Fokus-Block', !user.includes('primärer Fokus'))

console.log('Tool-Definitionen:')
check('4 Tools', TOOL_DEFS.length === 4, TOOL_DEFS.length)
for (const t of TOOL_DEFS) {
  check('Schema: ' + t.name, t.parameters.type === 'object' && typeof t.parameters.properties === 'object', JSON.stringify(t.parameters).slice(0, 50))
}
check('MAX_TOOL_ITERATIONS = 10', MAX_TOOL_ITERATIONS === 10)

console.log('')
if (failures > 0) { console.log('FEHLGESCHLAGEN:', failures); process.exit(1) }
console.log('ALLE TESTS BESTANDEN ✓')